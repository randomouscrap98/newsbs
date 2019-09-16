//Carlos Sanchez
//9-15-2019
//Deps: jquery, constants

function MakeContent(text)
{
   var content = $("<div></div>");
   content.addClass(CLASSES.Content);
   if(text) content.text(text);
   return content;
}

function MakeIconButton(image, color, func)
{
   var button = $("<button></button>"); 
   button.addClass(CLASSES.Control);
   button.addClass(CLASSES.IconButton);
   button.addClass(CLASSES.Hover); 
   //NOTE: I can't think of any iconbuttons that WON'T be fancy but you never know
   button.css("background-image", "url(" + image + ")");
   button.css("background-color", color);
   if(func) button.click(function(){func(button);});
   return button;
}

function MakeStandardForm(name, submitText)
{
   submitText = submitText || name;

   var form = $("<form></form>");
   var errorSection = $("<div></div>");
   var submit = $("<input type='submit'/>")

   form.attr("name", name);
   errorSection.addClass(CLASSES.List + " " + CLASSES.Errors);
   submit.val(submitText);
   submit.addClass(CLASSES.Hover);

   form.append(errorSection);
   form.append(submit);
   errorSection.hide();

   return form;
}

function MakeStandaloneForm(name, submitText)
{
   var form = MakeStandardForm(name, submitText);
   var header = $("<h2></h2>");
   header.addClass(CLASSES.Header);
   header.text(name);
   form.addClass(CLASSES.Standalone);
   form.prepend(header);
   return form;
}

function MakeInput(name, type, placeholder)
{
   var input = $("<input/>");
   input.attr("type", type);
   input.attr("name", name);
   input.attr("required", "");
   if(placeholder)
      input.attr("placeholder", placeholder);
   return input;
}

function MakeSuccessImage()
{
   var image = $("<img/>");
   image.addClass("success");
   image.prop("src", "icons/success.png");
   return image;
}


//TODO: Should these types of generic things go in generate???

function SetSingletonAttribute(element, container, attribute)
{
   container.find("*").removeAttr(attribute);
   element.attr(attribute, "");
}

