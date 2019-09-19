//Carlos Sanchez
//9-15-2019
//Deps: jquery, constants

//NOTE: NOTHING in this file should depend on languages or settings or
//whatever. This should ALL be GENERIC generation!

function Generate() { }

//TODO: Are these acceptable to put in "generate"?
Generate.prototype.SetSingletonAttribute = function(element, container, attribute)
{
   container.find("*").removeAttr(attribute);
   element.attr(attribute, "");
};

Generate.prototype.SetElementIcon = function(element, image)
{
   element.addClass(CLASSES.Icon);
   element.css("background-image", "url(" + image + ")");
};

//The REST of these are probably fine for generate (they're all "MAKE")
Generate.prototype.MakeContent = function(text)
{
   var content = $("<div></div>");
   content.addClass(CLASSES.Content);
   if(text) content.text(text);
   return content;
};

Generate.prototype.MakeSection = function()
{
   var section = $("<div></div>");
   section.addClass(CLASSES.Section);
   return section;
};

Generate.prototype.MakeIconButton = function(image, color, func)
{
   var button = $("<button></button>"); 
   button.addClass(CLASSES.Control);
   button.addClass(CLASSES.Clickable);
   button.addClass(CLASSES.Hover); 
   //NOTE: I can't think of any iconbuttons that WON'T be fancy but you never know
   button.css("background-color", color);
   this.SetElementIcon(button, image);
   if(func) button.click(function(){func(button);});
   return button;
};

Generate.prototype.MakeSuccessImage = function()
{
   var image = $("<img/>");
   image.addClass(CLASSES.Success);
   image.prop("src", IMAGES.Success);
   return image;
};


// **************
// * FORM STUFF *
// **************

function FormGenerate() { }

FormGenerate.prototype.MakeStandard = function(name, submitText)
{
   submitText = submitText || name;

   var form = $("<form></form>");
   var errorSection = $("<div></div>");
   var submit = $("<input type='submit'/>")

   form.attr("name", name);
   errorSection.addClass(CLASSES.List + " " + CLASSES.Errors);
   submit.val(submitText);
   submit.addClass(CLASSES.Hover);

   form.append(submit);
   form.append(errorSection);
   errorSection.hide();

   return form;
};

FormGenerate.prototype.MakeStandalone = function(name, submitText)
{
   var form = this.MakeStandardForm(name, submitText);
   var header = $("<h2></h2>");
   header.addClass(CLASSES.Header);
   header.text(name);
   form.addClass(CLASSES.Standalone);
   form.prepend(header);
   return form;
};

FormGenerate.prototype.MakeInput = function(name, type, placeholder)
{
   var input = $("<input/>");
   input.attr("type", type);
   input.attr("name", name);
   input.attr("required", "");
   if(placeholder)
      input.attr("placeholder", placeholder);
   return input;
};

//Since we GENERATED the dang thing, we're the only one that can FIND stuff in it.
FormGenerate.prototype.GetSubmit = function(form) { return form.find(SELECTORS.Submit); };
FormGenerate.prototype.GetErrors = function(form) { return form.find("." + CLASSES.Errors); };
FormGenerate.prototype.GetInputs = function(form) { return form.find(SELECTORS.Inputs); };
FormGenerate.prototype.GetInteractables = function(form) { return form.find(SELECTORS.AllInteract); };

FormGenerate.prototype.GatherValues = function(form)
{
   var inputs = form.find(SELECTORS.Inputs);
   var values = {};
   inputs.each(function() 
   { 
      if(this.name)
         values[this.name] = $(this).val()
   });
   return values;
};

//Stuff to MANIPULATE a form (do I really want this stuff here?)
FormGenerate.prototype.AddBeforeSubmit = function(form, input) { input.insertBefore(this.GetSubmit(form)); };
FormGenerate.prototype.ClearErrors = function (form) { this.GetErrors(form).hide().empty(); };

FormGenerate.prototype.AddError = function(form, error)
{
   if(!$.isArray(error))
      error = [ error ];

   var errors = this.GetErrors(form);
   errors.show()

   for(var i = 0; i < error.length; i++)
   {
      //this.Log.Warn("Adding error to form " + this.form.attr("name") + ": " + error[i]);
      var errorElement = $("<p></p>");
      errorElement.addClass(CLASSES.Error);
      errorElement.text(error[i]);
      errors.append(errorElement);
   }
};

FormGenerate.prototype.SetError = function (form, error)
{
   this.ClearErrors(form);
   this.AddError(form, error);
};

FormGenerate.prototype.SetRunningState = function(form, running)
{
   var inputs = form.find(SELECTORS.AllInteract);
   var submit = this.GetSubmit(form);

   inputs.prop('disabled', running);

   if(running)
   {
      submit.attr(ATTRIBUTES.Running, ""); 
      this.ClearErrors(form); //Assume that if you're RUNNING, it's a "new slate" so forget old errors
   }
   else
   {
      submit.removeAttr(ATTRIBUTES.Running); 
   }
};

FormGenerate.prototype.SetRunning = function(form) { this.SetRunningState(form, true); };
FormGenerate.prototype.ClearRunning = function(form) { this.SetRunningState(form, false); };

