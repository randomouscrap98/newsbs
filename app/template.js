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

   //Links
   apiLink: "",
   iconLink: "icons/",

   //Images
   homeImage: "{{>iconLink}}home.png",
   successImage: "{>>iconLink}}success.png",

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
   <div class="{{>contentClassf}} {{level}}">
      <time class="{{>metaClass}}">{{time}}</time>
      <span class="{{>contentClass}}">{{message}}</span>
   </div>
   {{/messages}}
</div>`

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
