#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { resolveCrossProjectEcosystem } from './lib/cross-project-ecosystem.mjs';

const requireProjectRoots =
  process.argv.includes('--require-roots') ||
  ['1', 'true', 'yes'].includes(String(process.env.CROSS_PROJECT_REQUIRE_ROOTS ?? '').toLowerCase());

const ecosystem = resolveCrossProjectEcosystem({
  scriptUrl: import.meta.url,
  cwd: process.cwd(),
});
const projects = ecosystem.projects.map((project) => ({
  name: project.name,
  root: project.scanRootPath,
  excludeSubmodules: project.name !== 'vt-platform',
}));

const rawExceptionPattern = /\bnew\s+(BadRequestException|HttpException|NotFoundException|ForbiddenException|UnauthorizedException|ConflictException|UnprocessableEntityException|InternalServerErrorException|ServiceUnavailableException)\s*\(/g;
const mongoFallbackPattern = /mongodb:\/\/(?:localhost|127\.0\.0\.1)/g;
const tenantFallbackPattern = /\bSYSTEM_TENANT_IDS\b|000000000000000000000001|\bisSystemId\b|provider\.isSystemId|\benvKeys\s*:|\btenantId\s*[:=]\s*['"`]SYSTEM['"`]|\btenantId\s*:\s*\{\s*\$in\s*:\s*\[[^\]]*['"`]SYSTEM['"`]|\[['"`]SYSTEM['"`]\s*,\s*tenantId\b/g;
const balanceActorSentinelPattern = /\badjustBalance\s*\([\s\S]{0,1200}['"`]SYSTEM['"`]/g;
const runtimeFallbackSentinelPattern = /\bfallback\s*=\s*1\b|\bsafeEarnRatio\b|\bcreatedById\s*:\s*new\s+Types\.ObjectId\s*\(\s*tenantId\s*\)|\bmetadata\?\.actorId[\s\S]{0,180}:\s*new\s+Types\.ObjectId\s*\(\s*affiliatePartyId\s*\)/g;
const systemTenantActorFallbackPattern = /\btriggeredBy\s*:\s*new\s+Types\.ObjectId\s*\(\s*tenantId\s*\)|\bapproveOne\s*\([\s\S]{0,240}AffiliateTriggerType\.SYSTEM\s*,\s*new\s+Types\.ObjectId\s*\(\s*tenantId\s*\)/g;
const vtImportPattern = /@vt\/[a-z0-9-]+/g;
const onEventPattern = /@OnEvent\s*\(/g;
const outboxPattern = /\b(?:OutboxService|outbox\.stage|outbox\.emit|outboxService\.stage|outboxService\.emit)\b/g;
const eventProducerPatterns = [
  /\b(?:this\.)?(?:outbox|outboxService)\.(?:stage|emit|publishEvent)\s*\(\s*([^,\n)]+)/g,
  /\beventType\s*:\s*([^,\n}]+)/g,
  /\bpublishEvent\s*\(\s*([^,\n)]+)/g,
];
const eventListenerPattern = /@OnEvent\s*\(\s*([^)]+?)\s*\)/g;
const eventClassificationConfigFile = '.vt-event-producer-classification.json';
const eventClassificationSpecFilePattern = /(?:^|[\\/])outbox-event-classification\.spec\.ts$/;
const requiredConsumerCoverageSpecFilePattern = /(?:^|[\\/])outbox-required-event\.consumer-coverage\.spec\.ts$/;
const eventClassificationObjectPattern =
  /\{[^{}]*topicToken\s*:\s*['"`]([^'"`]+)['"`]\s*,\s*owner\s*:\s*['"`]([^'"`]+)['"`]\s*,\s*rationale\s*:\s*['"`]([^'"`]+)['"`]([^{}]*)\}/g;
const externalRequiredCoverageObjectPattern =
  /eventType\s*:\s*([A-Z_]+_EVENT_TOPICS\.[A-Z0-9_]+)\s*,\s*route\s*:\s*([A-Z_]+_ROUTES\.[A-Z0-9_]+)\s*,\s*owner\s*:\s*['"`]([^'"`]+)['"`]/g;
const eventClassificationRationales = new Set([
  'required_route',
  'advisory_signal',
  'producer_only',
  'external_or_async_followup',
]);
const eventClassificationConsumerPolicies = new Set([
  'advisory_only',
  'synchronous_side_effect',
  'local_on_event_listener',
  'generic_outbox_realtime_relay',
  'scheduled_outbox_processor',
  'retry_scheduler',
  'internal_workflow',
  'best_effort_listener',
]);

const directoryExcludes = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.nx',
  '.next',
  'tmp',
  'temp',
]);

function shouldSkipDir(dirName, project) {
  if (directoryExcludes.has(dirName)) return true;
  if (project.excludeSubmodules && dirName === 'submodules') return true;
  if (dirName === 'OLD_CODE' || dirName === 'legacy' || dirName === '_archive') return true;
  return false;
}

function isSourceFile(filePath) {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath);
}

function isRuntimeSourceFile(filePath) {
  if (!/\.ts$/.test(filePath)) return false;
  if (/(\.spec|\.test)\.ts$/.test(filePath)) return false;
  if (filePath.includes(`${path.sep}test${path.sep}`)) return false;
  if (filePath.includes(`${path.sep}tests${path.sep}`)) return false;
  return true;
}

function* walk(project, current = project.root) {
  if (!fs.existsSync(current)) return;
  const entries = fs.readdirSync(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name, project)) yield* walk(project, fullPath);
      continue;
    }
    if (entry.isFile() && isSourceFile(fullPath)) yield fullPath;
  }
}

function countMatches(text, pattern) {
  pattern.lastIndex = 0;
  return Array.from(text.matchAll(pattern)).length;
}

function normalizeProjectPath(project, filePath) {
  return path.relative(project.root, filePath).replaceAll(path.sep, '/');
}

function normalizeClassificationEntry(entry, source, index) {
  const topicToken = normalizeEventToken(entry?.topicToken ?? '');
  const owner = String(entry?.owner ?? '').trim();
  const rationale = String(entry?.rationale ?? '').trim();
  const consumerPolicy = String(entry?.consumerPolicy ?? '').trim();
  const reason = String(entry?.reason ?? '').trim();

  if (!topicToken) {
    throw new Error(`${source} entry ${index} is missing topicToken`);
  }
  if (!owner) {
    throw new Error(`${source} entry ${index} is missing owner`);
  }
  if (!eventClassificationRationales.has(rationale)) {
    throw new Error(`${source} entry ${index} has unsupported rationale: ${rationale || '<empty>'}`);
  }
  if (rationale !== 'required_route' && !consumerPolicy) {
    throw new Error(
      `${source} entry ${index} for ${topicToken} is missing consumerPolicy`,
    );
  }
  if (consumerPolicy && !eventClassificationConsumerPolicies.has(consumerPolicy)) {
    throw new Error(
      `${source} entry ${index} has unsupported consumerPolicy: ${consumerPolicy}`,
    );
  }

  return { topicToken, owner, rationale, consumerPolicy, reason, source };
}

function addClassification(classifications, entry, errors) {
  const existing = classifications.get(entry.topicToken);
  if (!existing) {
    classifications.set(entry.topicToken, entry);
    return;
  }

  if (
    existing.owner !== entry.owner ||
    existing.rationale !== entry.rationale ||
    (existing.consumerPolicy ?? '') !== (entry.consumerPolicy ?? '')
  ) {
    errors.push(
      `Conflicting classification for ${entry.topicToken}: ${existing.owner}/${existing.rationale}/${existing.consumerPolicy || '-'} vs ${entry.owner}/${entry.rationale}/${entry.consumerPolicy || '-'}`,
    );
  }
}

function readJsonClassificationFile(project, filePath, classifications, sources, errors) {
  const source = normalizeProjectPath(project, filePath);
  sources.add(source);

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const entries = Array.isArray(parsed?.producerClassifications) ? parsed.producerClassifications : [];
    for (const [index, entry] of entries.entries()) {
      addClassification(classifications, normalizeClassificationEntry(entry, source, index), errors);
    }
  } catch (error) {
    errors.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readSpecClassificationFile(project, filePath, classifications, sources, errors) {
  const source = normalizeProjectPath(project, filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  let index = 0;

  for (const match of text.matchAll(eventClassificationObjectPattern)) {
    sources.add(source);
    const consumerPolicyMatch = String(match[4] ?? '').match(/consumerPolicy\s*:\s*['"`]([^'"`]+)['"`]/);
    try {
      addClassification(
        classifications,
        normalizeClassificationEntry(
          {
            topicToken: match[1],
            owner: match[2],
            rationale: match[3],
            consumerPolicy: consumerPolicyMatch?.[1],
          },
          source,
          index,
        ),
        errors,
      );
    } catch (error) {
      errors.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
    }
    index += 1;
  }
}

function loadEventProducerClassifications(project) {
  const classifications = new Map();
  const sources = new Set();
  const errors = [];
  const rootConfigPath = path.join(project.root, eventClassificationConfigFile);

  if (fs.existsSync(rootConfigPath)) {
    readJsonClassificationFile(project, rootConfigPath, classifications, sources, errors);
  }

  for (const filePath of walk(project)) {
    if (eventClassificationSpecFilePattern.test(filePath)) {
      readSpecClassificationFile(project, filePath, classifications, sources, errors);
    }
  }

  return {
    classifications,
    sources: Array.from(sources).sort(),
    errors,
  };
}

function readExternalRequiredCoverageFile(project, filePath, coverage, sources) {
  const source = normalizeProjectPath(project, filePath);
  const text = fs.readFileSync(filePath, 'utf8');

  for (const match of text.matchAll(externalRequiredCoverageObjectPattern)) {
    const topicToken = normalizeEventToken(match[1]);
    coverage.set(topicToken, {
      topicToken,
      route: normalizeEventToken(match[2]),
      owner: String(match[3] ?? '').trim(),
      source,
    });
    sources.add(source);
  }
}

function loadExternalRequiredEventCoverage(project) {
  const coverage = new Map();
  const sources = new Set();

  for (const filePath of walk(project)) {
    if (requiredConsumerCoverageSpecFilePattern.test(filePath)) {
      readExternalRequiredCoverageFile(project, filePath, coverage, sources);
    }
  }

  return {
    coverage,
    sources: Array.from(sources).sort(),
  };
}

function scanProject(project) {
  const eventProducerClassification = fs.existsSync(project.root)
    ? loadEventProducerClassifications(project)
    : { classifications: new Map(), sources: [], errors: [] };
  const externalRequiredEventCoverage = fs.existsSync(project.root)
    ? loadExternalRequiredEventCoverage(project)
    : { coverage: new Map(), sources: [] };
  const summary = {
    name: project.name,
    root: project.root,
    rootExists: fs.existsSync(project.root),
    files: 0,
    rawRuntimeException: 0,
    mongoFallback: 0,
    tenantFallback: 0,
    balanceActorSentinel: 0,
    runtimeFallbackSentinel: 0,
    systemTenantActorFallback: 0,
    onEvent: 0,
    outboxRefs: 0,
    eventProducerRefs: 0,
    eventListenerRefs: 0,
    eventProducerTokens: {},
    eventListenerTokens: {},
    eventProducerClassifications: eventProducerClassification.classifications,
    eventProducerClassificationSources: eventProducerClassification.sources,
    externalRequiredEventCoverage: externalRequiredEventCoverage.coverage,
    externalRequiredEventCoverageSources: externalRequiredEventCoverage.sources,
    externalRequiredRouteWithoutListenerTokens: {},
    classifiedProducerWithoutListenerByRationale: {},
    classifiedProducerWithoutListenerTokens: {},
    vtImports: {},
    findings: [],
    notes: [],
  };

  if (!summary.rootExists) {
    summary.notes.push({
      type: 'missingProjectRoot',
      message: `Project root does not exist: ${project.root}`,
    });
    if (requireProjectRoots) {
      summary.findings.push({ type: 'missingProjectRoot', file: project.root, count: 1 });
    }
    return summary;
  }

  for (const error of eventProducerClassification.errors) {
    summary.findings.push({
      type: 'eventProducerClassificationInvalid',
      file: project.root,
      count: 1,
      message: error,
    });
  }

  for (const filePath of walk(project)) {
    const text = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(project.root, filePath);
    summary.files += 1;

    if (isRuntimeSourceFile(filePath)) {
      const mongoFallback = countMatches(text, mongoFallbackPattern);
      if (mongoFallback > 0) {
        summary.mongoFallback += mongoFallback;
        summary.findings.push({ type: 'mongoFallback', file: relativePath, count: mongoFallback });
      }

      const rawRuntimeException = countMatches(text, rawExceptionPattern);
      if (rawRuntimeException > 0) {
        summary.rawRuntimeException += rawRuntimeException;
        summary.findings.push({ type: 'rawRuntimeException', file: relativePath, count: rawRuntimeException });
      }

      const tenantFallback = countMatches(text, tenantFallbackPattern);
      if (tenantFallback > 0) {
        summary.tenantFallback += tenantFallback;
        summary.findings.push({ type: 'tenantFallback', file: relativePath, count: tenantFallback });
      }

      const balanceActorSentinel = countMatches(text, balanceActorSentinelPattern);
      if (balanceActorSentinel > 0) {
        summary.balanceActorSentinel += balanceActorSentinel;
        summary.findings.push({ type: 'balanceActorSentinel', file: relativePath, count: balanceActorSentinel });
      }

      const runtimeFallbackSentinel = countMatches(text, runtimeFallbackSentinelPattern);
      if (runtimeFallbackSentinel > 0) {
        summary.runtimeFallbackSentinel += runtimeFallbackSentinel;
        summary.findings.push({ type: 'runtimeFallbackSentinel', file: relativePath, count: runtimeFallbackSentinel });
      }

      const systemTenantActorFallback = countMatches(text, systemTenantActorFallbackPattern);
      if (systemTenantActorFallback > 0) {
        summary.systemTenantActorFallback += systemTenantActorFallback;
        summary.findings.push({ type: 'systemTenantActorFallback', file: relativePath, count: systemTenantActorFallback });
      }
    }

    summary.onEvent += countMatches(text, onEventPattern);
    summary.outboxRefs += countMatches(text, outboxPattern);

    if (isRuntimeSourceFile(filePath)) {
      for (const pattern of eventProducerPatterns) {
        for (const match of text.matchAll(pattern)) {
          const token = normalizeEventToken(match[1] ?? match[0]);
          if (!shouldTrackEventToken(token)) continue;
          summary.eventProducerRefs += 1;
          summary.eventProducerTokens[token] = (summary.eventProducerTokens[token] ?? 0) + 1;
        }
      }

      for (const match of text.matchAll(eventListenerPattern)) {
        const token = normalizeEventToken(match[1]);
        if (!shouldTrackEventToken(token)) continue;
        summary.eventListenerRefs += 1;
        summary.eventListenerTokens[token] = (summary.eventListenerTokens[token] ?? 0) + 1;
      }
    }

    for (const match of text.matchAll(vtImportPattern)) {
      summary.vtImports[match[0]] = (summary.vtImports[match[0]] ?? 0) + 1;
    }
  }

  const trackableProducerTokens = Object.keys(summary.eventProducerTokens).filter(isTrackableEventExpression);
  const unclassifiedTrackableProducerTokens = trackableProducerTokens.filter(
    (token) => !summary.eventProducerClassifications.has(token),
  );
  const classifiedNonRequiredProducerTokens = trackableProducerTokens.filter((token) => {
    const classification = summary.eventProducerClassifications.get(token);
    return classification && classification.rationale !== 'required_route';
  });

  if (project.name !== 'vt-platform' && summary.eventProducerRefs > 0 && summary.eventListenerRefs === 0) {
    if (
      trackableProducerTokens.length > 0 &&
      unclassifiedTrackableProducerTokens.length === 0 &&
      classifiedNonRequiredProducerTokens.length === trackableProducerTokens.length
    ) {
      summary.notes.push({
        type: 'classifiedEventProducerWithoutOnEvent',
        message: 'Project has producer-only/advisory events classified by project evidence; no local @OnEvent listener gap is inferred.',
      });
    } else {
      const suffix = unclassifiedTrackableProducerTokens.length > 0
        ? ` Unclassified producer tokens=${unclassifiedTrackableProducerTokens.length}.`
        : '';
      summary.notes.push({
        type: 'eventProducerWithoutOnEvent',
        message: `Project has event/outbox producers but no @OnEvent listeners; verify events are audit-only or flushed by external consumers.${suffix}`,
      });
    }
  }

  let classifiedMissingListenerCount = 0;
  if (project.name !== 'vt-platform') {
    for (const [token, count] of Object.entries(summary.eventProducerTokens)) {
      if (!isTrackableEventExpression(token) || token in summary.eventListenerTokens) {
        continue;
      }

      const classification = summary.eventProducerClassifications.get(token);
      if (classification) {
        const externalRequiredCoverage = summary.externalRequiredEventCoverage.get(token);
        if (classification.rationale === 'required_route' && externalRequiredCoverage) {
          summary.externalRequiredRouteWithoutListenerTokens[token] = {
            count,
            owner: externalRequiredCoverage.owner,
            route: externalRequiredCoverage.route,
          };
          continue;
        }

        classifiedMissingListenerCount += 1;
        summary.classifiedProducerWithoutListenerByRationale[classification.rationale] =
          (summary.classifiedProducerWithoutListenerByRationale[classification.rationale] ?? 0) + count;
        summary.classifiedProducerWithoutListenerTokens[token] = {
          count,
          owner: classification.owner,
          rationale: classification.rationale,
          consumerPolicy: classification.consumerPolicy,
        };
        continue;
      }

      summary.notes.push({
        type: 'producerWithoutMatchingListenerToken',
        message: `${token} producer refs=${count}; no matching @OnEvent token found in this project and no producer classification evidence was found.`,
      });
    }
  }

  if (classifiedMissingListenerCount > 0) {
    summary.notes.push({
      type: 'classifiedProducerWithoutMatchingListenerToken',
      message: `${classifiedMissingListenerCount} producer token(s) lack a local @OnEvent token but are covered by producer classification evidence (${formatRationaleCounts(summary.classifiedProducerWithoutListenerByRationale)}).`,
    });
  }

  return summary;
}

function shouldTrackEventToken(token) {
  if (!token) return false;
  if (['string', 'string;', 'null', 'undefined', 'stub', 'eventType'].includes(token)) return false;
  if (/^[a-z]$/i.test(token)) return false;
  if (token.endsWith('.eventType')) return false;
  return isQuotedLiteralToken(token) || isTrackableEventExpression(token);
}

function isTrackableEventExpression(token) {
  return /(?:EVENT_TOPICS|_CATALOG_TOPICS|_EVENTS|Event\.|Events\.|AiAuditEvents\.|PublishJobEvent\.|QUOTE_EVENTS\.|WS_EVENTS\.)/.test(token);
}

function formatImports(imports) {
  const entries = Object.entries(imports).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '-';
  return entries.map(([name, count]) => `${name}=${count}`).join(', ');
}

function formatTokenCounts(tokens) {
  const entries = Object.entries(tokens).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '-';
  return entries.slice(0, 20).map(([name, count]) => `${name}=${count}`).join(', ');
}

function formatRationaleCounts(tokens) {
  const entries = Object.entries(tokens).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '-';
  return entries.map(([name, count]) => `${name}=${count}`).join(', ');
}

function formatClassifiedTokenDetails(tokens) {
  const rationaleRank = {
    required_route: 0,
    external_or_async_followup: 1,
    producer_only: 2,
    advisory_signal: 3,
  };
  const entries = Object.entries(tokens).sort(([tokenA, a], [tokenB, b]) => {
    const rationaleCompare = (rationaleRank[a.rationale] ?? 99) - (rationaleRank[b.rationale] ?? 99);
    if (rationaleCompare !== 0) return rationaleCompare;
    return tokenA.localeCompare(tokenB);
  });
  if (entries.length === 0) return '-';
  const formatted = entries
    .slice(0, 30)
    .map(([token, details]) => {
      const policySuffix = details.consumerPolicy ? `/${details.consumerPolicy}` : '';
      return `${token}:${details.rationale}/${details.owner}${policySuffix}=${details.count}`;
    });
  const suffix = entries.length > formatted.length ? `, ...(+${entries.length - formatted.length})` : '';
  return `${formatted.join(', ')}${suffix}`;
}

function formatExternalRequiredRouteDetails(tokens) {
  const entries = Object.entries(tokens).sort(([tokenA], [tokenB]) => tokenA.localeCompare(tokenB));
  if (entries.length === 0) return '-';
  return entries
    .map(([token, details]) => `${token}:${details.route}/${details.owner}=${details.count}`)
    .join(', ');
}

function normalizeEventToken(value) {
  return String(value)
    .trim()
    .split(',')[0]
    .trim()
    .replace(/,$/, '')
    .replace(/^['"`]([^'"`]+)['"`]$/, '$1');
}

function isQuotedLiteralToken(token) {
  return /^[a-z][a-z0-9_.-]*\.[a-z0-9_.-]+$/i.test(token);
}

const summaries = projects.map(scanProject);
let failed = false;

for (const item of summaries) {
  if (
    item.rawRuntimeException > 0 ||
    item.mongoFallback > 0 ||
    item.tenantFallback > 0 ||
    item.balanceActorSentinel > 0 ||
    item.runtimeFallbackSentinel > 0 ||
    item.systemTenantActorFallback > 0
  ) failed = true;
  if (requireProjectRoots && !item.rootExists) failed = true;
  console.log(`PROJECT ${item.name}`);
  console.log(`  root=${item.root}`);
  console.log(`  root_exists=${item.rootExists ? 'true' : 'false'}`);
  console.log(`  files=${item.files}`);
  console.log(`  raw_runtime_exception=${item.rawRuntimeException}`);
  console.log(`  mongo_localhost_fallback=${item.mongoFallback}`);
  console.log(`  tenant_fallback=${item.tenantFallback}`);
  console.log(`  balance_actor_sentinel=${item.balanceActorSentinel}`);
  console.log(`  runtime_fallback_sentinel=${item.runtimeFallbackSentinel}`);
  console.log(`  system_tenant_actor_fallback=${item.systemTenantActorFallback}`);
  console.log(`  on_event=${item.onEvent}`);
  console.log(`  outbox_refs=${item.outboxRefs}`);
  console.log(`  event_producer_refs=${item.eventProducerRefs}`);
  console.log(`  event_listener_refs=${item.eventListenerRefs}`);
  console.log(`  event_classifications=${item.eventProducerClassifications.size}`);
  console.log(`  event_classification_sources=${item.eventProducerClassificationSources.join(', ') || '-'}`);
  console.log(`  external_required_coverage_sources=${item.externalRequiredEventCoverageSources.join(', ') || '-'}`);
  console.log(`  vt_imports=${formatImports(item.vtImports)}`);
  console.log(`  event_producers=${formatTokenCounts(item.eventProducerTokens)}`);
  console.log(`  event_listeners=${formatTokenCounts(item.eventListenerTokens)}`);
  console.log(`  external_required_route_tokens=${formatExternalRequiredRouteDetails(item.externalRequiredRouteWithoutListenerTokens)}`);
  console.log(`  classified_missing_listener_tokens=${formatClassifiedTokenDetails(item.classifiedProducerWithoutListenerTokens)}`);
  for (const finding of item.findings) {
    console.log(
      `  FINDING ${finding.type} ${finding.file} count=${finding.count}${finding.message ? ` ${finding.message}` : ''}`,
    );
  }
  for (const note of item.notes) {
    console.log(`  NOTE ${note.type} ${note.message}`);
  }
}

if (failed) {
  console.error('CROSS_PROJECT_PATTERN_SCAN_FAIL');
  process.exitCode = 1;
} else {
  console.log('CROSS_PROJECT_PATTERN_SCAN_PASS');
}
