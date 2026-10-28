const loaded = new Map<string, Promise<void>>()

export function loadScript(src: string): Promise<void> {
  let promise = loaded.get(src)
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        loaded.delete(src)
        reject(new Error(`Failed to load ${src}`))
      }
      document.head.append(script)
    })
    loaded.set(src, promise)
  }
  return promise
}
