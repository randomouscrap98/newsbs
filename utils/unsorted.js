//Carlos Sanchez
//9-15-2019
//Deps: could be anything

//TODO: Put EVERYTHING in this file SOMEWHERE ELSE!!!

function GetAuthToken() { return localStorage.getItem("auth"); }
function SetAuthToken(token) { localStorage.setItem("auth", token); }

function SetSingletonAttribute(element, container, attribute)
{
   container.find("*").removeAttr(attribute);
   element.attr(attribute, "");
}

