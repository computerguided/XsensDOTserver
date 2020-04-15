// =======================================================================================
// Web GUI Handler
// Documentation: https://tinyurl.com/rtaoqbv
// =======================================================================================

// =======================================================================================
// Packages
// =======================================================================================
var fs = require('fs');

// =======================================================================================
// Constants
// =======================================================================================
const APP_DATA_DIR = 'data';

const STATIC_ASSETS_DIRECTORIES =
[
    '.',
    'images',
    'fonts',
    APP_DATA_DIR
];

const PORT = 8080;

// =======================================================================================
// Constructor
// =======================================================================================
class WebGuiHandler
{
    constructor(delegate) 
    {
        console.log( "Web GUI Handler instantiated" );

        this.delegate = delegate;
        this.express  = require('express');
        this.app      = this.express();
        this.http     = require('http').Server(this.app);
        this.io       = require('socket.io')(this.http);

        staticAssets(this, STATIC_ASSETS_DIRECTORIES);
        startWebserver(this);
        setHttpGetHandler(this);
        setWebsocketHandler(this);
    }

    sendGuiEvent( eventName, parameters )
    {
        this.io.emit( 'guiEvent', eventName, parameters );
    }
}

// =======================================================================================
// Local functions
// =======================================================================================

// ---------------------------------------------------------------------------------------
// -- Static assets --
// Make directories accessible.
// ----------------------------------------------------------------------------
function staticAssets( guiHandler, directories )
{
    directories.forEach( function( directory )
    {
        guiHandler.app.use(guiHandler.express.static( directory ));
    });
}
// ----------------------------------------------------------------------------
// -- Start webserver --
// ----------------------------------------------------------------------------
function startWebserver( guiHandler )
{
    guiHandler.http.listen(PORT, function ()
    {
        var ip = require("ip");
        console.log("Webserver listening on port " + PORT + ", IP address: " + ip.address() );
    });
}

// ----------------------------------------------------------------------------
// -- Websocket handler --
// ----------------------------------------------------------------------------
function setWebsocketHandler( guiHandler )
{
    guiHandler.io.on('connection', function( socket )
    {
         socket.on('guiEvent', function( eventName, parameters )
        {
            guiHandler.delegate.eventHandler( eventName, parameters );
        });

        socket.on('disconnect', function ()
        {
            console.log('Client disconnected');
        });

        socket.on('getFileList', function()
        {
            sendFileList(guiHandler);
        });

        socket.on('deleteFiles', function(files)
        {
            files.forEach( function (filename)
            {
                fs.unlinkSync( process.cwd() + "/" + APP_DATA_DIR + "/" + filename );
            });
            
            sendFileList(guiHandler);
        });

    });
}

// ----------------------------------------------------------------------------
// -- Set HTTP get handler --
// ----------------------------------------------------------------------------
function setHttpGetHandler( guiHandler )
{
    guiHandler.app.get('/', function (req, res)
    {
        res.sendFile(process.cwd() + '/index.html' );
    });
}

// ----------------------------------------------------------------------------
// -- Send file list --
// ----------------------------------------------------------------------------
function sendFileList( guiHandler )
{
    fs.readdir( process.cwd() + "/" + APP_DATA_DIR, function (err, files)
    {
        guiHandler.io.emit('fileList', files );
    });
};

// =======================================================================================
// Export class
// =======================================================================================
module.exports = WebGuiHandler;
