#!/bin/bash

# Generate the list of links using find and a single sed command, and store it in a variable
links=$(find . -name '*.html' | sed 's|.*|<li><a href="&">&</a></li>|')

# Create the output HTML file using a heredoc
cat <<EOF > index.html
<html>
<body>
<ul>
$links
</ul>
</body>
</html>
EOF

echo "List of links generated in index.html"
