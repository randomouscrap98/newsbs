//All the templates

//Template loader doesn't care whether it's from html or generated from
//javascript, it just needs you to produce an object with getter/setters for
//things. A template is just a fancy object.

//Hmm... perhaps make generic template loader so it can be swapped out, but
//implement it with the index for main website. This way people can easily
//swap out the templates with their own. Make sure there's a preload function
//on every template so users can keep all the functionality but only alter the
//html. Hmmmmm
function Template(name, element, fields)
{
   this.name = name;
   this.element = element;
   this.fields = fields; //Use getter/setters: Object.defineProperty(obj, "name", get: , set: });
   this.innerTemplates = {};

   this.functions = {}; //Need to keep track of which functions were added to us for hoisting
   this.functionPool = {};
}

Template.prototype.SetFields = function(fields)
{
   var me = this;
   Object.keys(fields).forEach(x => me.fields[x] = fields[x]);
};

var StdTemplating = Object.create(null); with (StdTemplating) (function($) { Object.assign(StdTemplating, 
{   
   //Ensure only a single field is ever defined for an object
   SingleField: function(obj, key, define)
   {
      if(key in obj)
         throw "Duplicate field: " + key;
      define.enumerable = true;
      define.configurable = true;
      Object.defineProperty(obj, key, define);
      return obj;
   },
   SingleFieldValue : function(obj, key, value)
   {
      return SingleField(obj, key, { value: value, writable: true });
   },
   //Read the field then remove it immediately afterwards.
   StripField : function(element, field, onlyExists)
   {
      var value = onlyExists ? element.hasAttribute(field) : element.getAttribute(field);
      element.removeAttribute(field);
      return value;
   },
   //Try to perform replacement on currentelement (if it's a template link,
   //otherwise do nothing)
   TryReplace : function(currentelement, tobj)
   {
      if(!currentelement) return

      var link = StripField(currentelement, "tlink");
      var hoist = StripField(currentelement, "thoist", true);
      var name = StripField(currentelement, "tname") || link;

      //Perform the standard stuff for this element
      if(link)
      {
         //Need to perform standard initialization. Store the template as an inner
         var innertobj = Load(link, tobj.functionPool);
         SingleFieldValue(tobj.innerTemplates, name, innertobj);

         //Replace ourselves with this.
         currentelement.parentNode.replaceChild(innertobj.element, currentelement);

         //Oh but if we're hoisting, pull all attributes out and place in
         //ourselves, otherwise put them in an aptly named thing
         if(hoist)
         {
            Object.keys(innerobj.fields).forEach(x =>
            {
               SingleField(tobj.fields, x, Object.getOwnPropertyDescriptor(innerobj.fields, x));
            });
            Object.keys(innerobj.functions).forEach(x =>
            {
               SingleFieldValue(tobj.functions, x, innerobj.functions[x]);
            });
         }
         else
         {
            SingleFieldValue(tobj.fields, name, innertobj.fields);
         }
      }

      return link;
   },
   ProcessField: function(currentelement, fieldname, tobj)
   {
      //Check for function first, do some special processing
      if(fieldname == "tfunc") //fieldname.startsWith("tfunc-"))
      {
         //var func = fieldname.substr(6);
         var parts = StripField(currentelement, fieldname).split("/");
         var func = parts[0];
         var pollfunc = parts[1] || func;

         if(!(pollfunc in tobj.functionPool)) //currentelement)
            throw "No function " + pollfunc + " in function pool for template: " + tobj.name;

         //Define a function on the tobj itself (if possible, it can't collide)
         //which calls a function within the function pool but WITH the template
         var f = (...args) =>
         {
            args.push(tobj);
            args.push(currentelement);
            tobj.functionPool[pollfunc].call(tobj.functionPool[pollfunc], ...args);
         };

         SingleFieldValue(tobj, func, f);
         SingleFieldValue(tobj.functions, func, f);
      }
      else if(fieldname.startsWith("t-"))
      {
         var name = fieldname.substr(2);
         var value = StripField(currentelement, fieldname);

         //Now the standard old neat things. Except... uhhh wait, how do you
         //define a function just for this template? oh no...
         if(value.startsWith("."))
         {
            var property = value.substr(1);

            //TODO: The "function" feature may not be used or may be changed
            if(property.endsWith("()"))
            {
               var func = property.substr(0, func.length - 2);

               if(!(func in tobj.functionPool)) //currentelement)
                  throw "No function " + func + " in function pool for template: " + tobj.name;

               SingleField(tobj.fields, name, {
                  get: () => tobj.functionPool[func + "_get"](currentelement, tobj),
                  set: (v) => tobj.functionPool[func + "_set"](currentelement, v, tobj)
               });
            }
            else
            {
               if(!(property in currentelement))
                  throw "No property " + property + " in template: " + tobj.name;

               SingleField(tobj.fields, name, {
                  get: () => currentelement[property], 
                  set: (v) => currentelement[property] = v 
               });
            }
         }
         else
         {
            //It's the field!
            SingleField(tobj.fields, name, {
               get : () => currentelement.getAttribute(value),
               set : (v) => currentelement.setAttribute(value, v)
            });
         }
      }
   },
   //Standard initialization for my index templates, which recurses through
   //elemets to find t-variables 
   Scan: function(currentelement, tobj)
   {
      if(!currentelement)
         return;

      //Stop scanning if it was replaced, there's nothing left to do, DON'T
      //recurse through the newly replaced template (it alerady WAS)
      if(TryReplace(currentelement, tobj))
         return;

      //Look for attributes and create standard redirects based on field value
      [...currentelement.attributes].forEach(x => 
      {
         ProcessField(currentelement, x.name, tobj);
      });

      //Call self for every child (recursive)
      [...currentelement.children].forEach(x => Scan(x, tobj));
   },
   //Get the template from the index, initializing all the inner crap etc. All
   //my templates should be this, you can add other templates ofc.
   Load : function(template, functionPool)
   {
      var base = templates2.content.getElementById(template);
      if(!base) throw "No template found with name: " + template;
      var element = base.cloneNode(true);
      var tobj = new Template(template, element, {});
      element.template = tobj; //make sure you can get back to the template from just the element
      tobj.functionPool = functionPool;
      element.setAttribute("data-template", template);
      element.removeAttribute("id");
      Scan(element, tobj);
      return tobj;
   }
})
//Private vars can go here
}(window));

//And now, this is the "specific" template system...?
var Templates = {
   ReplaceTemplatePlaceholders : function(element)
   {
      [...element.querySelectorAll("[data-template]")].forEach(x =>
      {
         //Create the template it asked for
         var tmpl = Templates.Load(x.getAttribute("data-template"));
         //Copy over the attributes
         [...x.attributes].forEach(y =>
         {
            if(y.name != "data-template")
               tmpl.element.setAttribute(y.name, y.value);
         });
         //Replace the element
         x.parentNode.replaceChild(tmpl.element, x);
      });
   },
   Load : function(template)
   {
      //Always try to load from ourselves first
      var selfLoad = template + "_load";
      if(selfLoad in Templates)
         return Templates[selfLoad];
      else
         return StdTemplating.Load(template, Templates);
   },
   UpdateLogs : function(logs, tobj, ce)
   {
      //Makes assumptions about logs to make it go quicker: assume ids ONLY go
      //up, logs will ALWAYS be in order, logs can't be inserted in the middle, etc
      while(ce.firstElementChild && (logs.length == 0 || Number(ce.firstElementChild.dataset.id) < logs[0].id))
      {
         //This would normally be bad, but what else can we do? set inner html
         //and rerender all? lol ok
         ce.removeChild(ce.firstElementChild);
      }

      //Find the last id, only display new ones.
      var lastId = (ce.lastElementChild ? Number(ce.lastElementChild.dataset.id) : 0);
      for(var i = 0; i < logs.length; i++)
      {
         if(logs[i].id > lastId)
         {
            var logMessage = Templates.Load("log");
            logMessage.SetFields(logs[i]); 
            logMessage.element.setAttribute("data-id", logs[i].id);
            ce.appendChild(logMessage.element);
         }
      }

      ce.scrollTop = ce.scrollHeight;
   }
};
