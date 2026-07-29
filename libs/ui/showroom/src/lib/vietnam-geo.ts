export interface GeoProvince {
  code: string;
  name: string;
  fullName: string;
}

export interface GeoWard {
  code: string;
  name: string;
  fullName: string;
}

interface GeoTreeProvince extends GeoProvince {
  wards?: GeoWard[];
}

let treeCache: GeoTreeProvince[] | null = null;
let treePromise: Promise<GeoTreeProvince[]> | null = null;

export async function loadVietnamGeoTree(): Promise<GeoTreeProvince[]> {
  if (treeCache) return treeCache;
  if (!treePromise) {
    treePromise = fetch('/geo/tree.json')
      .then(async (res) => {
        if (!res.ok) throw new Error('Không tải được dữ liệu địa giới');
        return (await res.json()) as GeoTreeProvince[];
      })
      .then((data) => {
        treeCache = data;
        return data;
      })
      .catch((err) => {
        treePromise = null;
        throw err;
      });
  }
  return treePromise;
}

export function wardsForProvince(
  tree: GeoTreeProvince[],
  provinceCode: string,
): GeoWard[] {
  return tree.find((p) => p.code === provinceCode)?.wards ?? [];
}
