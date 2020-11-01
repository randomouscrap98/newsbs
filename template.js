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
}

var TemplateSystem = Object.create(null); with (TemplateSystem) (function($) { Object.assign(TemplateSystem, 
   
   //Ensure only a single field is ever defined for an object
   SingleField: function(obj, key, define)
   {
      if(key in tobj.fields)
         throw "Duplicate field: " + key;
      define.enumerable = true;
      define.configurable = true;
      Object.defineProperty(obj, key, define);
      return obj;
   },
   //Simple single field: just a value (no getter/setter)
   SingleFieldValue : function(obj, key, value)
   {
      return SingleField(obj, key, { value : value, writable: true });
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
   StdTemplateTryReplace : function(currentelement, tobj)
   {
      if(!currentelement) return

      var link = StripField(currentelement, "tlink");
      var hoist = StripField(currentelement, "thoist", true);
      var name = StripField(currentelement, "tname") || link;

      //Perform the standard stuff for this element
      if(link)
      {
         //Need to perform standard initialization. Store the template as an inner
         var innertobj = StdTemplate(link);
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
   StdTemplateProcessField: function(currentelement, fieldname, tobj)
   {
      //Nothing to do!
      if(!fieldname.startsWith("t-"))
         return;

      var name = fieldname.substr(2);
      var value = StripField(currentelement, fieldname);

      //Now the standard old neat things. Except... uhhh wait, how do you
      //define a function just for this template? oh no...
   },
   //Standard initialization for my index templates, which recurses through
   //elemets to find t-variables 
   StdTemplateScan: function(currentelement, tobj)
   {
      if(!currentelement)
         return;

      //Stop scanning if it was replaced, there's nothing left to do, DON'T
      //recurse through the newly replaced template (it alerady WAS)
      if(StdTemplateTryReplace(currentelement, tobj))
         return;

      //Look for attributes and create standard redirects based on field value
      [...currentelement.attributes].forEach(x => 
      {
         StdTemplateProcessField(currentelement, x.name, tobj);
      }));

      //Call self for every child (recursive)
      [...currentelement.children].forEach(x => StdTemplateScan(x, tobj));
   },
   //Get the template from the index, initializing all the inner crap etc. All
   //my templates should be this, you can add other templates ofc.
   StdTemplate : function(template)
   {
      var base = templates2.getElementById(template) || throw "No template found with name: " + template;
      var element = base.cloneNode(true);
      var tobj = new Template(template, element, {});
      element.setAttribute("data-template", template);
      element.removeAttribute("id");
      StdTemplateScan(element, tobj);
      return tobj;
   },

   LoadTemplate : function(template)
   {
      //look inside yourself
   }
})
//Private vars can go here
}(window));

