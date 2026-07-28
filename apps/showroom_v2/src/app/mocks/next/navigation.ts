export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}

export function useRouter() {
  return {
    push: (url: string) => {
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    replace: (url: string) => {
      window.history.replaceState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    back: () => window.history.back(),
  };
}

export function notFound() {
  console.error("404 Not Found");
}
