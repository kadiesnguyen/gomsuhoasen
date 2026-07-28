import React from 'react';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export default function Link({ href, children, onClick, ...props }: LinkProps) {
  const navigateWithinApp = (destination: string) => {
    const url = new URL(destination, window.location.origin);
    const nextHref = `${url.pathname}${url.search}${url.hash}`;
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextHref === currentHref && url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.history.pushState({}, '', nextHref);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }
    if (e.defaultPrevented) return;

    // Ignore special browser behaviors and modified clicks.
    if (
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      props.target === '_blank' ||
      props.download !== undefined ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    ) {
      return;
    }

    const resolvedUrl = new URL(href, window.location.origin);
    if (resolvedUrl.origin !== window.location.origin) {
      return;
    }

    e.preventDefault();
    navigateWithinApp(href);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
