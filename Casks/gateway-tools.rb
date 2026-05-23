cask "gateway-tools" do
  version "0.24.10"
  sha256 "5f8254e5b2c27ef642dcc1853fd7bb72137319790ab47495a313a9b341cbcc1f"

  url "https://github.com/superaddmin/Gateway-tools/releases/download/v#{version}/Gateway-tools_#{version}_universal.dmg",
      verified: "github.com/superaddmin/Gateway-tools/"
  name "Gateway-tools"
  desc "Account manager for AI IDEs (Antigravity and Codex)"
  homepage "https://github.com/superaddmin/Gateway-tools"

  auto_updates true

  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/Gateway-tools.app"],
                   sudo: true
  end

  app "Gateway-tools.app"

  zap trash: [
    "~/Library/Application Support/com.superaddmin.gateway-tools",
    "~/Library/Caches/com.superaddmin.gateway-tools",
    "~/Library/Preferences/com.superaddmin.gateway-tools.plist",
    "~/Library/Saved Application State/com.superaddmin.gateway-tools.savedState",
  ]

  caveats <<~EOS
    The app is automatically quarantined by macOS. A postflight hook has been added to remove this quarantine.
    If you still encounter the "App is damaged" error, please run:
      sudo xattr -rd com.apple.quarantine "/Applications/Gateway-tools.app"
  EOS
end
