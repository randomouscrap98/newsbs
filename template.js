//All the templates
// WARN: DEPENDENCY ON "libbo.js"

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

//This has a UIkit optimization: it will NOT set fields that are already the
//same. This has quite a high overhead for standard internal fields, but
//external fields can cause a MASSIVE mutationobserver event for any set, so
//it's better to spend a tiny amount of time avoiding that.
Template.prototype.SetFields = function(fields, forceChanges)
{
   var me = this;
   Object.keys(fields).forEach(x => 
   {
      var f = fields[x]; //This might be compute intensive? So don't do it twice
      if(forceChanges || (me.fields[x] != f))
         me.fields[x] = f;
   });
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
   _CheckFunctionPool : function(func, tobj)
   {
      if(!(func in tobj.functionPool))
         throw "No function " + func + " in function pool for template: " + tobj.name;
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

         _CheckFunctionPool(pollfunc, tobj);

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
            var funcparen = property.indexOf("(");
            //var funcmatch = property.match(/\([^)]\)$/);

            //TODO: The "function" feature may not be used or may be changed
            if(funcparen >= 0)
            {
               var args = property.substr(funcparen + 1).slice(0,-1).split(",").map(x => x.trim()) || [];
               var func = property.substr(0, funcparen); //property.length - 2);
               var gfunc = func + "_get";
               var sfunc = func + "_set";

               _CheckFunctionPool(gfunc, tobj);
               _CheckFunctionPool(sfunc, tobj);

               SingleField(tobj.fields, name, {
                  get: () => tobj.functionPool[gfunc](currentelement, tobj, name, args),
                  set: (v) => tobj.functionPool[sfunc](v, currentelement, tobj, name, args)
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
var Templates = Object.create(null); with (Templates) (function($) { Object.assign(Templates, 
{
   //"Private" (public) helper stuff. You can override these if you REALLY want to...
   //----------------------------------
   _templateData : "tmpldat_",
   _templateArgName : (name, args, prefix) => (args && args[1]) ? args[1] : (prefix ? prefix:"") + name,
   _stdDate : (d) => (new Date(d)).toLocaleDateString(),
   _stdDateDiff : (d, short) => Utilities.TimeDiff(d, null, short),

   //More like... website data
   _ttoic : { 
      "chat" : "commenting",
      "resource" : "file-text",
      "documentation" : "tag",
      "program" : "laptop",
      "tutorial" : "info",
      "category" : "folder",
      "userpage" : "user"
   },
   _activitytext : {
      "c" : "created",
      "r" : "read",
      "u" : "edited",
      "d" : "deleted"
   },


   //Dependency injection, please override these
   //----------------------------------
   signal: (signal) => console.log("Ignoring template signal " + signal + "; please inject click handler"),
   imageLink: (id, size, square) => { throw "No image linker defined for Templates object!"; },
   links : {},

   //"Global" functions for people using the template system from the outside
   //(the internal machinations don't really need these)
   //----------------------------------
   ActivateTemplates : function(element)
   {
      [...element.querySelectorAll("[data-template]")].forEach(x =>
      {
         var templatename = x.getAttribute("data-template");
         //Create the template it asked for
         var tmpl = Load(templatename);
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
   LoadHere : function(template, data)
   {
      var template = Load(template);
      template.SetFields(data);
      return template.element;
   },

   //Stuff meant to be attached to templates to call from the outside,
   //individual template "helper" functions
   //----------------------------------
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
            var logMessage = Load("log");
            logMessage.SetFields(logs[i]); 
            logMessage.element.setAttribute("data-id", logs[i].id);
            ce.appendChild(logMessage.element);
         }
      }

      ce.scrollTop = ce.scrollHeight;
   },

   //Generic helper functions for any internal/external set to call
   //----------------------------------
   show: (v, ce) =>
   {
      if(v) //if it's a truthy value at ALL, stop hiding, otherwise hide
         ce.removeAttribute("hidden");
      else
         ce.setAttribute("hidden", "");
   },
   icon: (v, ce) =>
   {
      if(v || v == "0")
      {
         var width = Number(ce.getAttribute("width"));
         if((width % 10) == 5 && width < 100)
            width *= 2;
         ce.setAttribute("src", imageLink(v, width, true));
      }
      else
      {
         ce.removeAttribute("src");
      }
   },
   showicon: (v, ce) =>
   {
      icon(v, ce);
      show(v, ce);
   },
   typeicon: (v, ce, tobj) =>
   {
      if(v)
         ce.setAttribute("uk-icon", _ttoic[v] || "close");
      else
         ce.removeAttribute("uk-icon");
   },
   discussionuser: (v, ce, tobj, name, args) =>
   {
      //Already has optimization for uikit non-resetting fields
      tobj.SetFields({
         id: v.id,
         date: _stdDate(v.createDate),
         username : v.username,
         userlink : links.User(v.id),
         avatar: v.avatar,
         super: v.super
      });
   },
   pageicon: (v, ce, tobj) =>
   {
      var f = { "thumbnail" : v.values ? v.values.thumbnail : "", "private" : v.isPrivate() };

      if (!f.thumbnail) 
         f.type = v.type;

      tobj.SetFields(f);
   },
   pageitem: (v, ce, tobj) =>
   {
      tobj.SetFields({
         name: v.name,
         pagelink: Links.Page(v.id),
         createdate: _stdDate(v.createDate),
         userlink: Links.User(v.createUserId),
         useravatar : v.createUser.avatar,
         pinned : v.pinned
      });
      tobj.fields.pageicon.page = v;
   },
   historyitem: (v, ce, tobj) =>
   {
      var link = "#";
      var title = "???";
      var action = _activitytext[v.action];

      if(v.linked) 
      {
         title = v.linked.name || ("User: " + v.linked.username);

         if(v.type === "content")
         {
            link = links.Page(v.contentId);
         }
         else if(v.type === "category")
         {
            link = links.Category(v.contentId); 
         }
         else if(v.type === "user")
         {
            //There's special events when the -1 user does things (wait is 0
            //default or -1??)
            if(Number(v.userId) <= 0 && v.action == "u")
            {
               v.user = v.linked;
               action = "created an account!";
               title = "";
            }
            else
            {
               //Just treat it normally
               link = links.User(v.contentId); 
            }
         }
      }
      else if(v.action == "d")
      {
         title = v.extra;
      }

      tobj.SetFields({
         useravatar : v.user.avatar,
         username : v.user.username,
         userlink : Links.User(v.user.id),
         action : action,
         pagename : title,
         pagelink : link,
         id : v.id,
         date : _stdDateDiff(v.date, true) //Utilities.TimeDiff(activity.date, null, true)
      });
   },

   //The actual internal get/set mechanisms
   //----------------------------------
   internal_get: (ce, tobj, name, args) => ce[_templateArgName(name, args, _templateData)],
   internal_set: (v, ce, tobj, name, args) => 
   {
      ce[_templateArgName(name, args, _templateData)] = v;

      if(args && args[0])
         Templates[args[0]](v, ce, tobj, name, args);
   },

   external_get: (ce, tobj, name, args) => ce.getAttribute(_templateArgName(name, args, "data-")),
   external_set: (v, ce, tobj, name, args) =>
   {
      ce.setAttribute(_templateArgName(name, args, "data-"), v);

      if(args && args[0])
         Templates[args[0]](v, ce, tobj, name, args);
   },

   //All the rest of the get/set
   //----------------------------------
   spa_get : (ce, tobj) => ce.getAttribute("href"),
   spa_set : function(v, ce, tobj)
   {
      ce.onclick = (event) =>
      {
         event.preventDefault();
         signal("spaclick_event", { element: event.target, url: event.target.href });
      };
      ce.setAttribute("href", v);
   }
})
//Private vars can go here
}(window));
