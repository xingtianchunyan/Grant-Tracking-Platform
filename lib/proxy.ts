import { ProxyAgent, setGlobalDispatcher } from "undici"

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY

if (proxyUrl) {
  try {
    const dispatcher = new ProxyAgent(proxyUrl)
    setGlobalDispatcher(dispatcher)
    console.log(`[PROXY] Global proxy agent configured for: ${proxyUrl}`)
  } catch (err) {
    console.error("[PROXY] Failed to configure global proxy:", err)
  }
}
