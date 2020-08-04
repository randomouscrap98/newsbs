index.html: myconvert index.config index_template.html
	echo "---" | cat index.config - index_template.html | ./myconvert > index.html

myconvert: myconvert.c
	gcc myconvert.c -o myconvert

.PHONY: clean
clean:
	rm index.html
	rm myconvert
