# Xsens DOT server

This is a simple web server that one can use to detect, connect, enable Xsens DOT sensor and record data.

It uses Node.js in combination with Noble (https://github.com/abandonware/noble).

To install the software, clone it or download it to a folder and use "npm install" in that folder.

Please configure your OS as described on the Noble page ((https://github.com/abandonware/noble).

The server can be started by typing "node xsensDotServer" on the command prompt. It will print the IP address and port on which the server listens. Typing this in a browser (e.g. "http://192.168.86.31:8080") will connect to the server and open the GUI.

Design documentation is part of the repository.
