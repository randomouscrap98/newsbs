//All the templates
// WARN: DEPENDENCY ON "libbo.js"

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
         return StdTemplating.Load(template, Templates); //, templates2);
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
            logMessage.SetFields(logs[i], false, true); 
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
   click: (v, ce) =>
   {
      ce.onclick = (e) => v(e, ce, tobj);
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

   //Highly specific template loading (usually still used with internal/external)
   //----------------------------------
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
   slideshowpages: (v, ce, tobj) =>
   {
      tobj.SetFields({
         images: v.map(x => ({
            title: x.name,
            link: Links.Page(x.id),
            image: imageLink(x.getPhotos()[0])
         }))
      });
   },
   slideshowpage: (v, ce, tobj) =>
   {
      tobj.SetFields({
         images: v.getPhotos().map(x => imageLink(x))
      });
   },
   slideshowimages: (v, ce, tobj) =>
   {
      v.forEach(x =>
      {
         if(x.link || x.title)
            ce.appendChild(LoadHere("annotatedslideshowitem", x));
         else
            ce.appendChild(LoadHere("simpleslideshowitem", {image:x.image}));
      });
   },
   piechart: (v, ce, tobj) =>
   {
      var pie = ce.querySelector("[data-pie]");
      pie.innerHTML = "";
      var r = 9.5; var cx = 10; var cy = 10;
      var cumulative = 0;
      v.forEach(x =>
      {
         var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
         var thisarc = x.percent * Math.PI * 2;
         path.setAttribute('d', `M ${cx+r*Math.cos(cumulative)} ${cy-r*Math.sin(cumulative)} ` +  
          `A ${r} ${r} 0 ${(x.percent > 0.5)?1:0} 0 ` +
          `${cx+r*Math.cos(cumulative+thisarc)} ${cy-r*Math.sin(cumulative+thisarc)} ` + 
          `L 10 10`);
         cumulative+=thisarc;
         path.setAttribute('fill', x.color);
         path.setAttribute('stroke', x.color);
         path.setAttribute("data-preserve", "");
         pie.appendChild(path);
      });
   },

   //Routes
   //----------------------------------
   routepage: (v, ce, tobj) =>
   {
      //console.log(v);
      tobj.SetFields({
         title: v.name,
         permissions: v.myPerms,
         pinned: v.pinned,
         format : v.values.markupLang,
         content : v
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
   },
   render_get : (ce, tobj) => ce.getAttribute("data-raw"),
   render_set : (v, ce, tobj) =>
   {
      ce.setAttribute("data-raw", v);
      ce.innerHTML = "";
      ce.appendChild(Parse.parseLang(v.content, v.values.markupLang)); //content.content, content.format));
         //var content = JSON.parse(repl);
   }
})
//Private vars can go here
}(window));
