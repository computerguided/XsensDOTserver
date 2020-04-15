var noble = require('noble');

var WebGuiHandler = require('./webGuiHandler');

const SENSOR_NAME = "Xsens DOT";

function messageHandler( messageName, data )
{
    if( messageName.localeCompare('startScanning') )
    {
        startScanning();
    }
    else if( messageName.localeCompare('stopScanning') )
    {
        startScanning();
    }
}

var guiHandler = new WebGuiHandler(messageHandler);

function startScanning()
{
	// Any service UUID, no duplicates.
	console.log( 'Start scanning' );
	noble.startScanning( [], false );
}

function stopScanning()
{
	console.log( 'Scanning stopped' );
	noble.stopScanning();  
}

// -------------------------------------------------------------------------------------------------
noble.on( 'stateChange', function(state)
{
	if( state == 'poweredOn' )
	{
		console.log( 'Powered on' );
	}
	else
	{
		console.log( 'Stop scanning' );
	}
});
// 
// -------------------------------------------------------------------------------------------------
noble.on( 'discover', function(peripheral)
{
    var localName = peripheral.advertisement.localName;
    
	if( localName && localName.localeCompare(SENSOR_NAME) == 0 )
	{
        console.log( "Sensor detected, with name '" + localName + "' and address " + peripheral.address );
        guiHandler.sendMessage
        ( 
            'sensorDetected', 
            {
                name:localName, 
                address:peripheral.address
            }
        );
    }
});