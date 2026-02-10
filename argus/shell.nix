{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Rust toolchain
    rustup

    # Build essentials
    gcc
    pkg-config
    openssl
    openssl.dev

    # RISC Zero dependencies
    cmake
    clang
    llvmPackages.libclang

    # Useful tools
    jq
  ];

  LIBCLANG_PATH = "${pkgs.llvmPackages.libclang.lib}/lib";
  OPENSSL_DIR = "${pkgs.openssl.dev}";
  OPENSSL_LIB_DIR = "${pkgs.openssl.out}/lib";
  OPENSSL_INCLUDE_DIR = "${pkgs.openssl.dev}/include";

  shellHook = ''
    # Ensure rustup is initialized
    if ! command -v cargo &> /dev/null; then
      echo "Installing Rust toolchain..."
      rustup default stable
    fi

    export PATH="$HOME/.risc0/bin:$PATH"

    # Aliases
    alias crr="cargo run --release --"

    echo "boundless-debug dev shell"
    echo "Alias: crr = cargo run --release --"
  '';
}
