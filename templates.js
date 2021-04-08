//All the templates
// WARN: DEPENDENCY ON "libbo.js"

//And now, this is the "specific" template system...?
var Templates = Object.create(null); with (Templates) (function($) { Object.assign(Templates, 
{
   //"Private" (public) helper stuff. You can override these if you REALLY want to...
   //----------------------------------
   _rawremove : [ "_template", "parentCategory", "childpages", "childCategories" ],
   _templateData : "tmpldat_",
   _includekey : "include_",
   //_commentId : (id) => "comment-" + id,
   _templateArgName : (name, args, prefix) => (args && args[1]) ? args[1] : (prefix ? prefix:"") + name,
   _stdDate : (d) => (new Date(d)).toLocaleDateString(),
   _stdDateTime : (d) => (new Date(d)).toLocaleString(),
   _stdDateDiff : (d, short) => Utilities.TimeDiff(d, null, short),
   _displayRaw : (title, raw) => {
      rawmodaltitle.textContent = title;
      rawmodalraw.textContent = raw;
      UIkit.modal(rawmodal).show();
   },
   _displayRawObject : (title, obj) => 
   {
      var tmp = {};
      _rawremove.forEach(x =>
      {
         if(x in obj)
         {
            tmp[x] = obj[x];
            delete obj[x];
         }
      });
      _displayRaw(title, JSON.stringify(obj, null, 2));
      Object.keys(tmp).forEach(x =>
      {
         obj[x] = tmp[x];
      });
   },
   _pagethumbnail: (v) =>
   {
      var th = false;
      if(v.values)
      {
         if(v.values.thumbnail) 
            th = v.values.thumbnail;
         else if(v.values.photos)
            th = v.values.photos.split(",")[0];
      }
      return th || "assets/placeholder.svg";
   },

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
   _stoic : {
      "3ds" : {"t" : "3DS", "i" : "assets/3ds.svg" },
      "n3ds" : {"t" : "New 3DS", "i" : "assets/3ds.svg" },
      "wiiu" : {"t" : "Wii U", "i" : "assets/wiiu.svg" },
      "switch" : {"t" : "Switch", "i" : "assets/switch.svg" }
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
   log : false, //This HAS to be overridden, otherwise things fail!

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
      if(data) template.SetFields(data);
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
   ClickSelf : (v, tobj, ce) =>
   {
      ce.click();
   },
   AddComment : (comment, mergetime, tobj, ce) =>
   {
      //Starting from bottom, find place to insert.
      var comments = ce.querySelectorAll("[data-messageid]");
      var insertAfter = ce.firstElementChild;

      for(var i = comments.length - 1; i >= 0; i--)
      {
         //This is the place to insert!
         if(comment.id > Number(comments[i].getAttribute("data-messageid")))
         {
            insertAfter = comments[i];
            break;
         }
      }

      //console.log("CE:", ce, "insertafter:", insertAfter, "comments:", comments);

      //Oops, this really shouldn't happen!!
      if(!insertAfter)
      {
         throw "Didn't find a place to insert comment " + comment.id + 
            " into discussion " + comment.parentId;
      }

      var insertFrame = (insertAfter.getAttribute("data-template") == "messagefragment")
         ? insertAfter.template.fields.frame : insertAfter;
      var newFrame = null;

      //Oops, we need a new frame
      if(insertFrame.getAttribute("data-template") != "messageframe" || 
         insertFrame.template.fields.userid != comment.createUserId ||
         (new Date(comment.createDate)).getTime() - (new Date(insertAfter.template.fields.createdate)).getTime() 
          > mergetime)
      {
         //create a frame to insert into
         newFrame = LoadHere("messageframe", { message : comment }); 
         insertAfter = newFrame.template.fields.messagelist.firstChild;
      }

      var fragment = Templates.LoadHere("messagefragment", { 
         message : comment,
         frame : newFrame || insertFrame
      });

      Utilities.InsertAfter(fragment, insertAfter);

      if(newFrame)
         Utilities.InsertAfter(newFrame, insertFrame);

      return { fragment : fragment, frame : fragment.template.fields.frame };
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
   spin: (v, ce) =>
   {
      if(v) //if it's a truthy value at ALL, stop hiding, otherwise hide
         ce.className += " uk-spinner"; 
      else
         ce.className = ce.className.replace(/uk-spinner/g, '');
   },
   hide: (v, ce) => show(!v, ce),
   icon: (v, ce) =>
   {
      var vn = Number(v);
      if(v !== undefined)
      {
         var ln = v;

         if(vn >= 0) 
         {
            var width = Number(ce.getAttribute("width"));
            if((width % 10) == 5 && width < 100)
               width *= 2;
            ln=imageLink(vn, width, true);
         }

         ce.setAttribute("src", ln);
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
   showtexticon: (v, ce) =>
   {
      ce.querySelector("[data-text]").textContent = v;
      show(v, ce);
   },
   typeicon: (v, ce, tobj) =>
   {
      if(v || v === "")
         ce.setAttribute("uk-icon", _ttoic[v] || "close");
      else
         ce.removeAttribute("uk-icon");
   },
   select: (v, ce, tobj) =>
   {
      ce.innerHTML = "";
      Object.keys(v).forEach(x =>
      {
         var opt = document.createElement("option");
         opt.value = x;
         opt.textContent = v[x] || x;
         ce.appendChild(opt);
      });
   },

   //Highly specific template loading (usually still used with internal/external)
   //----------------------------------
   userdropdown : (v, ce, tobj, name, args) =>
   {
      //Already has optimization for uikit non-resetting fields
      tobj.SetFields({
         id: v.id,
         createdate: _stdDate(v.createDate),
         username : v.username,
         link : links.User(v.id),
         super: v.super
      });
   },
   discussionuser: (v, ce, tobj, name, args) =>
   {
      tobj.SetFields({
         avatar: v.avatar
      });
      tobj.fields.userdropdown.user = v;
   },
   stdcontentinfo: (v, ce, tobj, name, args) =>
   {
      tobj.SetFields({
         createuseravatar : v.createUser.avatar,
         createdate : _stdDate(v.createDate),
         commentsearchlink : Links.CommentSearch(v.id)
      });
      tobj.fields.createuserdropdown.user = v.createUser;
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
         date : _stdDateDiff(v.date, true)
      });
   },
   subcat: (v, ce, tobj) =>
   {
      tobj.SetFields({
         name: v.name,
         link: Links.Category(v.id)
      });
   },
   slideshow_pages: (v, ce, tobj) =>
   {
      tobj.SetFields({
         images: v.map(x => ({
            title: x.name,
            link: Links.Page(x.id),
            image: imageLink(x.getPhotos()[0])
         }))
      });
   },
   slideshow_page: (v, ce, tobj) =>
   {
      tobj.SetFields({
         images: v.getPhotos().map(x => ({image: imageLink(x)}))
      });
   },
   slideshow_images: (v, ce, tobj) =>
   {
      v.forEach(x =>
      {
         if(x.link || x.title)
            ce.appendChild(LoadHere("annotatedslideshowitem", x));
         else
            ce.appendChild(LoadHere("simpleslideshowitem", {image:x.image}));
      });
   },
   pagecontrols: (v, ce, tobj) =>
   {
      tobj.SetFields({
         votes: v.about.votes,
         watchcount: v.about.watches.count,
         permissions: v.myPerms,
         watched: v.about.watching,
         vote: v.about.myVote,
         editlink: "?p=pageedit-"+v.id,
         rawaction: event => { event.preventDefault(); _displayRawObject(v.name, v); },
         pinned: "pinned" in v ? v.pinned : "undefined"
      });
   },
   pagecontrols_votes : (v, ce, tobj) =>
   {
      var vt = v.b.count + v.o.count + v.g.count;
      var dataset = [];

      if(vt)
         dataset = ["g","o","b"].map(x => ({percent: v[x].count/vt,attrs:{"data-vote":x}})); 

      tobj.SetFields({
         dataset: dataset,
         votecount: vt
      });
   },
   pagecontrols_vote : (v, ce, tobj) =>
   {
      ce.removeAttribute("data-voted");
      [...ce.querySelectorAll("[data-vote]")].forEach(x => x.removeAttribute("data-selected"));
      var votelm = ce.querySelector('[data-vote="' + v + '"]');
      if(votelm) 
      {
         votelm.setAttribute("data-selected", "");
         ce.setAttribute("data-voted", "");
      }
   },
   pagecontrols_votefunc: (v, ce, tobj) =>
   {
      var clk = (event) =>
      {
         event.preventDefault();
         var original = tobj.fields.vote;
         var originalvotes = tobj.fields.votes;
         var failure = () => 
         {
            tobj.fields.vote = original;
            tobj.fields.votes = originalvotes;
         };

         //Pre-emptively set the watch status
         var newvote = event.currentTarget.getAttribute("data-vote");
         var newvotes = Utilities.ShallowCopy(originalvotes);
         if(original == newvote) newvote = false;
         if(newvote)
            newvotes[newvote].count++;
         if(original)
            newvotes[original].count--;
         tobj.fields.vote = newvote;
         tobj.fields.votes = newvotes;
         tobj.fields.votefunc(newvote, failure);
      };
      [...ce.querySelectorAll("[data-vote]")].forEach(x => x.onclick = clk);
   },
   pagecontrols_watchfunc: (v, ce, tobj) =>
   {
      ce.onclick = (event) =>
      {
         event.preventDefault();
         var original = tobj.fields.watched == "true";
         var originalcount = Number(tobj.fields.watchcount);
         var failure = () => 
         {
            tobj.fields.watched = original;
            tobj.fields.watchcount = originalcount;
         };

         //Pre-emptively set the watch status
         tobj.fields.watched = !original;
         tobj.fields.watchcount = originalcount + (original ? -1 : 1);
         tobj.fields.watchfunc(!original, failure);
      };
   },
   genericsearch : (v, ce, tobj) =>
   {
      var sub = (e) =>
      {
         tobj.fields.loading = true;
         e.preventDefault();
         v(tobj.fields.searchvalue, tobj);
      };

      tobj.SetFields({
         searchsubmit : sub,
         searchclick : sub
      });
   },
   sbhardware : (v, ce, tobj) =>
   {
      var dat = v && _stoic[v.toLowerCase()];
      tobj.SetFields({
         icon : dat && dat.i,
         text: dat && dat.t
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
         if(x.percent == 0) return;
         if(x.percent == 1) x.percent = 0.999;
         var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
         var thisarc = x.percent * Math.PI * 2;
         path.setAttribute('d', `M ${cx+r*Math.sin(cumulative)} ${cy-r*Math.cos(cumulative)} ` +  
          `A ${r} ${r} 0 ${(x.percent > 0.5)?1:0} 1 ` +
          `${cx+r*Math.sin(cumulative+thisarc)} ${cy-r*Math.cos(cumulative+thisarc)} ` + 
          `L 10 10`);
         cumulative+=thisarc;
         if(x.color)
         {
            path.setAttribute('fill', x.color);
            path.setAttribute('stroke', x.color);
         }
         if(x.attrs)
         {
            Object.keys(x.attrs).forEach(y => path.setAttribute(y, x.attrs[y]));
         }
         path.setAttribute("data-preserve", "");
         pie.appendChild(path);
      });
   },
   modulemessage : (v, ce, tobj) =>
   {
      var date = v.createDate || new Date().toISOString();
      tobj.SetFields({
         id : v.id,
         message : v.message,
         time : "[" + (new Date(date)).toTimeString().substr(0,8) + "]"
      });
   },
   browseitem : (v, ce, tobj) =>
   {
      var key = (v.values && v.values.key && v.type=="program") ? v.values.key : undefined;
      tobj.SetFields({
         title : v.name,
         thumbnail : _pagethumbnail(v),
         type: v.type,
         path: v.parentCategory ? v.parentCategory.getPath() : "[Orphaned page]",
         link: Links.Page(v.id),
         username : v.createUser.username,
         userlink: Links.User(v.createUserId),
         useravatar : v.createUser.avatar,
         key : key,
         createdate : _stdDate(v.createDate),
         comments : key ? undefined : v.about.comments.count
      });
      tobj.innerTemplates.pagecontrols.fields.page = v;
      if(v.values && v.values.system && v.type=="program")
      {
         tobj.fields.sbhardware.system = v.values.system;
         tobj.fields.sbhardware.text = "";
      }
   },
   messagefragment : (v, ce, tobj) =>
   {
      tobj.SetFields({
         createdate : v.createDate,
         editdate : v.editDate,
         content : v.content,
         messageid : v.id
      });
   },
   messageframe : (v, ce, tobj) =>
   {
      var parsed = FrontendCoop.ParseComment(v.content);
      //console.log(v);

      tobj.SetFields({
         userid : v.createUser.id,
         useravatar : parsed.a || v.createUser.avatar,
         userlink : Links.User(v.createUser.id),
         username : v.createUser.username,
         frametime : _stdDateTime(v.createDate)
      });
   },
   discussion_loadingcomments : (v, ce, tobj) =>
   {
      tobj.SetFields({
         showloading: v,
         showloader: !v
      });
   },
   commentsearchexpand : (v, ce, tobj) =>
   {
      var d = (new Date(v.createDate)).getTime();
      var dd = (d) => { return (new Date(d)).toISOString(); };
      var cs = (ds, de) => Links.CommentSearch(v.parentId, { cs : dd(d + ds), ce : dd(d + de) });
      tobj.SetFields({
         searchtimeone : cs(-60000 * 1, 60000 * 1),
         searchtimetwo : cs(-60000 * 15, 60000 * 15),
         searchtimethree : cs(-60000 * 60, 60000 * 60)
      });
   },

   //Routes
   //----------------------------------
   //What we ALWAYS do for pages no matter what kind they are (this system may
   //need to be simplified though)
   generalpage : (v, ce, tobj) =>
   {
      //We ALWAYS want to set fields, even if there's no page. This way, if
      //someone sets the page to "nothing", it will clear out the data.
      v = v || {};
      
      tobj.SetFields({
         permissions: v.myPerms,
         pinned: v.pinned,
         format : v.values && v.values.markupLang,
         content : v
      });

      Utilities.ToggleAttribute(tobj.innerTemplates.pagecontrols.element, "hidden", !v.id);
      if(v.id) tobj.innerTemplates.pagecontrols.fields.page = v;
   },
   //Actually setting a page for the standard page display
   routepage: (v, ce, tobj) =>
   {
      generalpage(v, ce, tobj);

      tobj.SetFields({
         title: v.name,
         key : v.values.key //This is a little weird, we ALWAYS set the key? It might not exist
      });

      if(v.type === "program")
      {
         tobj.element.querySelector("[data-programcontainer]").removeAttribute("hidden");
         Utilities.ToggleAttribute(tobj.innerTemplates.slideshow.element, "hidden", !v.values.photos);
         tobj.fields.slideshow.page = v;
         tobj.fields.sbhardware.system = v.values.system;
      }
   },
   routecommentsearch: (v, ce, tobj) =>
   {
      tobj.SetFields({
         title: v.name,
         pageid : v.id,
         resetlink : Links.CommentSearch(v.id)
      });
   },
   //Setting the user (which should always exist) for the standard user display
   routeuser: (v, ce, tobj) =>
   {
      tobj.SetFields({
         title: v.username,
         avatar: v.avatar,
         banned : v.banned,
         userid: v.id
      });
      //Hide "create page" if we're NOT the current user, this can only be
      //known upon setting the user
      Utilities.ToggleAttribute(ce.querySelector("[data-createuserpage]"), "hidden", !v.isCurrentUser());
   },
   //Setting the userpage (which may not exist) for the standard user display
   routeuser_page : (v, ce, tobj) =>
   {
      generalpage(v, ce, tobj);
      //Hide nopage if there's a v, this can only be known upon receiving a page
      Utilities.ToggleAttribute(ce.querySelector("[data-nopage]"), "hidden", v);
   },
   routecategory : (v, ce, tobj) =>
   {
      tobj.SetFields({
         title: v.name,
         subcats: v.childCategories,
         pages: Utilities.StableSort(v.childpages, (a,b) => (b.pinned?1:0)-(a.pinned?1:0)),
         description: v.description,
         permissions : v.myPerms,
         editlink : "?p=categoryedit-" + v.id,
         newlink : "?p=categoryedit&pid=" + v.id,
         newpagelink : "?p=pageedit&pid=" + v.id,
         rawaction: event => { event.preventDefault(); _displayRawObject(v.name, v); },
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
   self_get : (ce, tobj) => ce,
   self_set : function(v, ce, tobj)
   {
      throw "Can't replace template elements through fields (yet)!";
   },
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
      ce.setAttribute("data-raw", v.content);
      ce.innerHTML = "";

      //Don't render if there's nothing.
      if(v.content)
         ce.appendChild(Parse.parseLang(v.content, v.values.markupLang)); 
   },
   rendercomment_get : (ce, tobj) => ce.getAttribute("data-raw"),
   rendercomment_set : (v, ce, tobj) =>
   {
      ce.setAttribute("data-raw", v);
      ce.innerHTML = "";

      //Don't render if there's nothing.
      if(v)
      {
         //TODO: direct dependency on API.js (is this OK?)
         var parsed = FrontendCoop.ParseComment(v);
         ce.appendChild(Parse.parseLang(parsed.t, parsed.m));
      }
   },
   list_get : (ce, tobj, name, args) => 
   {
      return [...ce.children].filter(x => x.template).map(x => 
      {
         var r = x.template.fields[args[1]];
         if(!("_template" in r))
            r["_template"] = x.template;
         return r;
      });
   },
   list_set : (v, ce, tobj, name, args) =>
   {
      if(!("length" in v))
         throw "Can't set non-list object on template field " + name;
      if(!v.length)
         return;

      ce.innerHTML = "";
      v.forEach(x => 
      {
         var dt = {};
         if(args[1])
            dt[args[1]] = x;
         else
            dt = x;
         ce.appendChild(LoadHere(args[0], dt))
      });
   },
   listshow_get : (ce, tobj, name, args) => list_get(ce, tobj, name, args),
   listshow_set : (v, ce, tobj, name, args) =>
   {
      list_set(v, ce, tobj, name, args);
      show(v && v.length, ce);
   },
   browseparams_get : (ce, tobj) =>
   {
      var params = new URLSearchParams();

      if(tobj.fields.reverse.input)
         params.set("reverse", tobj.fields.reverse.input);
      if(tobj.fields.watches.input)
         params.set("watches", tobj.fields.watches.input);

      params.set("sort", tobj.fields.sort.input);

      var types = [];

      Object.keys(tobj.fields).forEach(x =>
      {
         if(x.startsWith(_includekey) && tobj.fields[x].input)
         {
            types.push(x.substr(_includekey.length));
         }
      });

      params.set("types", types.join(","));

      return params;
   },
   browseparams_set : (v, ce, tobj) =>
   {
      var types = (v.get("types") || "").split(",").filter(x => x).map(x => x.toLowerCase());

      if(v.has("sort"))
         tobj.fields.sort.input = v.get("sort");
      if(v.has("reverse"))
         tobj.fields.reverse.input = v.get("reverse") == "true";
      if(v.has("watches"))
         tobj.fields.watches.input = v.get("watches") == "true";

      Object.keys(tobj.fields).forEach(x =>
      {
         if(x.startsWith(_includekey))
         {
            var name = x.substr(_includekey.length);
            tobj.fields[x].input = (types.indexOf(name) >= 0);
         }
      });
   }
})
//Private vars can go here
}(window));
