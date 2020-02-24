//For now this is where they go. If you want to change it, nobody should
//notice.
var _templates =
{
   //Classes
   contentClass: "content",
   sectionClass: "section",
   controlClass: "control",
   clickableClass: "clickable",
   hoverClass: "hover",
   iconClass: "icon",
   listClass: "list",
   logClass: "log",
   metaClass: "meta",
   errorsClass: "errors",
   errorClass: "error",
   standaloneClass: "standalone",
   headerClass: "header",

   //Actual templates
   content: `<div class="{{>contentClass}}">{{.}}</div>`,
   section: `<div class="{{>sectionClass}}">{{{.}}}</div>`,
   tab: 
`<a href="{{{link}}}" class="{{>controlClass}} {{>clickableClass}} {{>hoverClass}}"
   style="{{#color}}background-color: {{color}};{{/color}}">
   <img class="{{>iconClass}}" src="{{{image}}}">
</a>`,
   log:
`<div class="{{>sectionClass}} {{>listClass}} {{>logClass}}">
   {{#messages}}
   <div class="{{level}}">
      <time class="{{>metaClass}}">{{time}}</time>
      <span class="{{>contentClass}}">{{message}}</span>
   </div>
   {{/messages}}
</div>`,
   form:
`<form name="{{name}}" action="javascript:void(0);"
  class="{{#standalone}}{{>standaloneClass}}{{/standalone}}">
   {{! You can mark a form as standalone, adds header/class}}
   {{#standalone}}  
   <h2 class="{{>headerClass}}">{{name}}</h2>
   {{/standalone}}
   {{! Assume a form is full of inputs. Manually add raw html, don't put in template}}
   {{#inputs}}      
   <label>
   {{#text}}<span>{{text}}:</span>{{/text}}
   {{#textarea}}{{>textarea}}{{/textarea}}
   {{^textarea}}{{>input}}{{/textarea}}
   </label>
   {{/inputs}}
   <input type="submit" class="{{>>hoverClass}}" 
    value="{{#submit}}{{submit}}{{/submit}}{{^submit}}{{name}}{{/submit}}">
   <div class="{{>listClass}} {{>errorsClass}}"></div>
</form>`,
   inputGeneral: 
`name="{{name}}" {{#required}}required=""{{/required}} {{#number}}data-number=""{{/number}}
 placeholder="{{#placeholder}}{{placeholder}}{{/placeholder}}"`,
   input: `<input type="{{type}}" {{>inputGeneral}} {{#value}}value="{{value}}"{{/value}}>`,
   textarea: `<textarea {{>inputGeneral}}>{{#value}}{{value}}{{/value}}</textarea>`,
   error: `<p class="{{>errorClass}}">{{.}}</p>`,
   contentLink: `<a href="{{{link}}}" class="contentLink">{{text}}</a>`

};

function Templating(Logger)
{
   this.logger = Logger;
}

Templating.prototype.Load = function(completion)
{
   this.logger.Info("Loading templates");
   //For this version, there is no loading. Alert the waiter
   completion(this);
};

//Render should NEVER accept more than ONLY what is required to render (not
//even the user/etc). Things like language/etc. belong somewhere else
//(probably)
Templating.prototype.Render = function(name, data)
{
   this.logger.Debug("Rendering template " + name);
   return Mustache.render(_templates[name], data || "", _templates);
};

Templating.prototype.RenderElement = function(name, data)
{
   return $(this.Render(name, data));
};
