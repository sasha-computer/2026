{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    nodePackages.npm
    nodePackages.typescript
    nodePackages.typescript-language-server
    nodePackages.wrangler
  ];

  shellHook = ''
    echo "Japan Trip 2026 - Development Environment"
    echo "Commands:"
    echo "  npm run dev     - Start dev server"
    echo "  deploy          - Build and deploy to Cloudflare Pages"

    deploy() {
      npm run build && npx wrangler pages deploy dist --project-name=japan-trip-2026
    }
  '';
}
