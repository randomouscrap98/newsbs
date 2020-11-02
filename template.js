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
      //Nothing to do!
      if(!fieldname.startsWith("t-"))
         return;

      var name = fieldname.substr(2);
      var value = StripField(currentelement, fieldname);

      //Now the standard old neat things. Except... uhhh wait, how do you
      //define a function just for this template? oh no...
      if(value.startsWith("."))
      {
         var property = value.substr(1);

         if(property.endsWith("()"))
         {
            var func = property.substr(0, func.length - 2);

            if(!(func in tobj.functionPool)) //currentelement)
               throw "No function " + func + " in template: " + tobj.name;

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
   //appendclass_get : function(el)
   //{
   //   
   //   var loglevel = "log_" + replace;
   //   if(el.className.indexOf(loglevel) < 0)
   //      el.className += " " + loglevel;
   //   return loglevel;
   //}
   Load : function(template)
   {
      //Always try to load from ourselves first
      var selfLoad = template + "_load";
      if(selfLoad in Templates)
         return Templates[selfLoad];
      else
         return StdTemplating.Load(template, Templates);
   }
};
