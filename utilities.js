//Carlos Sanchez
//9-12-2019

// ************************************
// * Utilities (Should work anywhere) *
// ************************************
//
// These have no dependencies; all required data should be passed in through
// parameters or whatever. If you need namespacing UGH maybe later

function MakeContent(text)
{
   var content = $("<div></div>");
   content.addClass("content");
   content.text(text);
   return content;
}

function MakeSmallNavButton(image, color, func)
{
   var button = $("<button></button>"); 
   button.addClass("control");
   button.addClass("iconbutton");
   button.css("background-image", "url(" + image + ")");
   button.css("background-color", color);
   button.click(function(){func(button);});
   return button;
}

function SetSingletonAttribute(element, container, attribute)
{
   container.find("*").removeAttr(attribute);
   element.attr(attribute, "");
}

