# Serving the site from Windows with Cloudflare

## What ships

- `npm run build:web` creates the standalone site in `dist/renderer/`.
- The frontend is static, but it reads live posts and bookmarks from Convex at runtime.
- That means you only rebuild when code changes. Content changes flow through Convex immediately.

## Recommended path: Cloudflare Tunnel

1. Build the site on the Windows PC with `npm run build:web`.
2. Serve the output locally with something simple like `npx serve dist/renderer -l 8080`.
3. Install `cloudflared` on the PC.
4. Authenticate once with `cloudflared tunnel login`.
5. Create a tunnel: `cloudflared tunnel create narukealpha-blog`.
6. Route DNS: `cloudflared tunnel route dns narukealpha-blog blog.example.com`.
7. Create `%USERPROFILE%\\.cloudflared\\config.yml`:

```yaml
tunnel: narukealpha-blog
credentials-file: C:\\Users\\<you>\\.cloudflared\\<tunnel-id>.json

ingress:
  - hostname: blog.example.com
    service: http://localhost:8080
  - service: http_status:404
```

8. Install the tunnel as a service: `cloudflared service install`.
9. In Cloudflare DNS, keep the record proxied so the public hostname stays behind Cloudflare.

Why this is the sane default:

- no inbound router port-forwarding,
- no public Windows firewall hole for 80/443,
- easy to keep the blog on a private home network.

## Windows firewall notes

With Cloudflare Tunnel, you usually do not need a new inbound firewall rule because `cloudflared` makes outbound connections only.

You do still want to allow the local site server and `cloudflared` through Windows Defender Firewall when prompted.

## Alternative path: direct port forward

Only use this if you explicitly want your PC exposed directly.

1. Serve the site locally on a fixed port, for example `8080`.
2. Open Windows Firewall for that port, for example in PowerShell:

```powershell
New-NetFirewallRule -DisplayName "NarukeAlpha Blog 8080" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080
```

3. Forward that same port from the router to the Windows PC.
4. In Cloudflare DNS, point `blog.example.com` to the home public IP.
5. Put a reverse proxy in front if you want 80/443 and certificate management on the Windows machine.

Tradeoff: this works, but it is more fragile than the tunnel route and creates a real inbound surface on the network.

## Convex deployment checklist

1. Create the hosted Convex deployment.
2. Put the deployment URL into both `VITE_CONVEX_URL` and `CONVEX_URL`.
3. Generate a long random `STUDIO_WRITE_KEY`.
4. Set the same key locally for Electron and in Convex:

```bash
npx convex env set STUDIO_WRITE_KEY "your-random-key"
```

5. Run the site on the PC and the Electron app on the MacBook against that same deployment.

At that point the flow is simple: post from the MacBook, Convex updates immediately, and the Windows-hosted site reflects the change without a git push or rebuild.
