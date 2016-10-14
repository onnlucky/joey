conscious.min.js: conscious.all.js
	minify conscious.all.js -o $@

conscious.all.js: lib.js libg.js conscious.js
	tsc --allowJs --out $@ $^
