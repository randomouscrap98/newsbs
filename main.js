//Carlos Sanchez
//9-11-2019

var CONST =
{
   Active : "data-active"
};

var EMain = false;

$( document ).ready(function()
{
   EMain = {
      LeftPane : $("#leftpane"),
      LeftScroller : $("#leftscroller"),
      RightPane : $("#rightpane"),
      SmallNav : $("#smallnav")
   };

   var temp = MakeContent("this\n\n\n\n\n\n\nis\n\n\n\n\n\n\nsome\n\n\n\n\n\n\n\n\ncontent");
   EMain.LeftScroller.append(temp);
   EMain.SmallNav.append(MakeSmallNavButton("favicon.ico", "#77FF77", SetActiveContent));
   EMain.SmallNav.append(MakeSmallNavButton("favicon.ico", "#FFAA77", SetActiveContent));
   EMain.SmallNav.append(MakeSmallNavButton("favicon.ico", "#77AAFF", SetActiveContent));

});

// ****************************************
// * WARN: FUNCTIONS DEPENDING ON GLOBALS *
// ****************************************
//
// These are essentially scripts
 
//Setting active CONTENT will update the left pane. Anything can be content...
function SetActiveContent(element)
{
   SetSingletonAttribute(element, EMain.RightPane, CONST.Active);
}
