zip:
	zip -r -FS ../nmvs-scanner.zip * --exclude .git --exclude Makefile --exclude index.html

all: zip