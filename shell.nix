{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Python (for explorer_client.py)
    python3
    python3Packages.requests

    # Web app
    bun
    nodejs_22
  ];

  shellHook = ''
    echo "Boundless Explorer Development Environment"
    echo ""
    echo "Python client: python explorer_client.py"
    echo "Web app:"
    echo "  cd web && bun install && bun run dev"
    echo ""

    # Auto-install and start web dev server
    if [ -d "web" ]; then
      cd web
      if [ ! -d "node_modules" ]; then
        echo "Installing web dependencies..."
        bun install
      fi
      echo "Starting dev server..."
      bun run dev --open
    fi
  '';
}
