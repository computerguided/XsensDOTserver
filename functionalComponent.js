// =======================================================================================
// Functional Component Class.
// Documentation: https://tinyurl.com/r7twd4e
// =======================================================================================

class FunctionalComponent 
{
    constructor(name, transitions, choicePoints) 
    {
        this.name               = name;
        this.stateMachineTable  = {};
        this.choicePoints       = {};

        if( transitions != undefined && transitions.length > 0)
        {
            this.stateMachineTable = processStateTransitionsTable(transitions);
            this.currentState = transitions[0].stateName;
        }

        if (choicePoints != undefined && choicePoints.length > 0)
        {
            this.choicePoints = processChoicePointsTable(choicePoints);
        }
    }

    eventHandler( eventName, parameters )
    {
        
        ///console.log( "state: " + this.currentState + ", event: " + eventName );

        var entryString = this.currentState + '-' + eventName;
        var transition  = this.stateMachineTable[entryString];
        if( transition == undefined ) 
        {
            console.log
            ( 
                "ERROR: component '" + this.name + "' " +
                "received unexpected event '" + eventName + "' " +
                "in state '" + this.currentState + "'"
            );
            return;
        }

        if( transition.transFunc == undefined)
        {
            console.log
            (
                "ERROR: component '" + this.name + "' " +
                "has undefined transition function for event '" + eventName + "' " +
                "in state '" + this.currentState + "'"
            );
            return;
        }

        transition.transFunc( this, parameters );

        var previousState = this.currentState;
        this.currentState = transition.nextState;

        if( this.currentState.charAt(this.currentState.length-1) != '?' ) return;

        var choicePoint = this.choicePoints[ this.currentState ];
        if( choicePoint == undefined )
        {
            console.log
            (
                "ERROR: component '" + this.name + "'  " +
                "unknown choice-point '" + this.currentState + "'"
            );
            this.currentState = previousState;
            return;
        }

        if( choicePoint(this) )
        {
            this.eventHandler('yes')
        }
        else
        {
            this.eventHandler('no' );
        }
    }
}

// =======================================================================================
// Local functions
// =======================================================================================

// ---------------------------------------------------------------------------------------
// -- Process state transitions table --
// ---------------------------------------------------------------------------------------
function processStateTransitionsTable( stateTransitionsTable )
{
    var stateMachineTable = {};

    var entryString, transition;
    for( var i=0; i < stateTransitionsTable.length; i++ )
    {
        transition = stateTransitionsTable[i];

        entryString = transition.stateName + '-' + transition.eventName;
        if( stateMachineTable[ entryString ] != undefined )
        {
            console.log( "ERROR: transition for event '" + transition.eventName  + "' " +
                         "in state '" + transition.stateName + "' " + 
                         "already defined!" );
            continue;
        }
        stateMachineTable[ entryString ] = transition;
    };

    return stateMachineTable;
}

// ---------------------------------------------------------------------------------------
// -- Process choice-points table --
// ---------------------------------------------------------------------------------------
function processChoicePointsTable( choicePointsTable )
{
    var choicePoints = {};
    choicePointsTable.forEach( function(choicePoint)
    {
        choicePoints[choicePoint.name] = choicePoint.evalFunc;
    });
    return choicePoints;
}

// =======================================================================================
// Export the FunctionalComponent class
// =======================================================================================
module.exports = FunctionalComponent;