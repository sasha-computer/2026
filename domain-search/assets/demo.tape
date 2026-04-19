Output assets/domain-search-demo.mp4
Output assets/domain-search-demo.gif

Set Shell "fish"
Set Width 900
Set Height 620
Set FontSize 20
Set FontFamily "Berkeley Mono Variable"
Set Padding 24
Set Theme "Catppuccin Frappe"
Set TypingSpeed 40ms
Set Framerate 30

Hide
Type "clear"
Enter
Sleep 500ms
Show

Sleep 500ms

# First: show basic domain search
Type "uvx domain-search startup --tld com io dev app xyz"
Sleep 500ms
Enter
Sleep 6s

Sleep 2000ms

# Second: the showstopper - domain hacks
Type "uvx domain-search --hack creative"
Sleep 500ms
Enter
Sleep 8s

Sleep 2000ms

# Third: another fun hack search
Type "uvx domain-search --hack launch"
Sleep 500ms
Enter
Sleep 6s

Sleep 3000ms
