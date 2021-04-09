// ***************
// --- ROUTING ---
// ***************

// This file has a LOT of dependencies, because it is both the router AND the
// actual logic for loading the pages at the end of the routes. For all intents
// and purposes, it is a portion of "index.js", but was broken out so all the 
// stuff specific to paging and routes was in the same place

var Links = {
   _base : (page, extras) =>
   {
      var params = new URLSearchParams();
      params.append("p", page);
      if(extras)
         Object.keys(extras).forEach(x => params.append(x, extras[x]));
      return "?" + params.toString();
   },
   User : (id, args) => Links._base(`user-${id}`, args),
   Page : (id, args) => Links._base(`page-${id}`, args),
   //WARN: should this be its own thing???
   CommentSearch : (id, args) => Links._base(`comments-${id}`, args),
   Category : (id, args) => Links._base(`category-${id}`, args)
};

var DefaultSpaRouting = new SpaProcessor(url => 
{
   if(globals.leaveprotect)
   {
      return confirm("You will lose unsaved changes, are you sure you want to leave the page?");
   }
   return true;
}, (url, rid) =>
{
   var spadata = parseLink(url);
   spadata.rid = rid;
   spadata.route = "route" + spadata.page;

   var loadFunc = window[spadata.route + "_load"];

   if(!loadFunc)
   {
      pageerror("SPA process", "Couldn't find loader for page " + spadata.page);
      return;
   }

   //Alert anybody else who wants to know that we've done a click
   signals.Add("spastart", spadata);
   loadFunc(spadata);
});

function parseLink(url)
{
   var params = Utilities.GetParams(url);
   var pVal = params.get("p") || "home"; 
   var pParts = pVal.split("-");
   return {
      url : url,
      p : pVal,
      params : params,
      page : pParts[0],
      id : pParts[1]
   };
}

//Handle a spa route completion event, assuming all the data was loaded/etc
function route_complete(spadat, title, applyTemplate, breadcrumbs, cid)
{
   //If we are the LAST request, go ahead and finalize the process.
   if(spadat.rid === globals.spa.requestId)
   {
      if(breadcrumbs)
         breadcrumbs.forEach(x => x.link = x.link || (x.content ? Links.Page(x.id) : Links.Category(x.id)));

      writeDom(() =>
      {
         renderPage(spadat.route, (t) =>
         {
            setLeaveProtect(t.hasAttribute("data-leaveprotect"));
            applyTemplate(t);
         }, breadcrumbs);
         if(!breadcrumbs)
            makeBreadcrumbs([{link:"?p=" + spadat.page,name:title}]);
         setTitle(title);
         if(!cid)
            hideDiscussion();
         globals.spahistory.push(spadat);

         signals.Add("routecomplete", { spa : spadat });
      });
   }
   else
   {
      log.Warn("Ignoring page finalization: " + spadat.url);
   }
}

function routehome_load(spadat) 
{ 
   route_complete(spadat, null, templ =>
   {
      var params = new URLSearchParams();
      params.append("requests", "content-" + JSON.stringify({
         "type" : "program",
         "associatedkey" : "photos",
         "associatedvalue" : "_%",
         "sort" : "random",
         "limit": getLocalOption("frontpageslideshownum")
      }));
      params.set("content", "id,name,type,parentId,createDate,editDate,createUserId,values");
      globals.api.Chain(params, apidata =>
      {
         log.Datalog("see devlog for frontpage data", apidata);
         var data = apidata.data;
         templ.template.fields.pages = data.content;
      });
      var homehistory = templ.querySelector("[data-homehistory]");
      homehistory.appendChild(makeActivity());
   }); 
}

function routetest_load(spadat) 
{ 
   route_complete(spadat, "Test", templ =>
   {
      templ.appendChild(makeUserSearch(x => { console.log("Selected: ", x);}));
   }); 
}

function routeadmin_load(spadat) 
{ 
   route_complete(spadat, "Admin", templ =>
   {
      var userselects = templ.querySelectorAll('[data-userselect]');
      [...userselects].forEach(x => x.appendChild(makeUserCollection(x.getAttribute("name"), false, 1)));

      var banform = templ.querySelector('[data-banform]');
      formSetupSubmit(banform, "ban", bandat =>
      {
         notifySuccess("Banned user: " + bandat.bannedUserId);
      }, fd =>
      {
         fd.bannedUserId = fd.bannedUserId[0];
         var now = new Date();
         now.setTime(now.getTime() + Number(fd.expireDate) * 60 * 60 * 1000);
         fd.expireDate = now.toISOString();
      });

      var lastBanId = Math.pow(2, 40); //arbitrary lol
      var banhistory = templ.querySelector('[data-banhistory]');
      var loadbans = templ.querySelector("[data-loadmorebans]");

      loadbans.onclick = () =>
      {
         var params = new URLSearchParams();
         params.append("requests", "ban-" + JSON.stringify({ 
            "maxId" : lastBanId,
            "reverse" : true 
         }));
         params.append("requests", "user.0createUserId.0bannedUserId");
         globals.api.Chain(params, apidat =>
         {
            var data = apidat.data;
            var users = idMap(data.user);
            lastBanId = Math.min(...data.ban.map(x => x.id));
            data.ban.forEach(x =>
            {
               var bnt = cloneTemplate("banhistoryitem");
               var duration = Utilities.TimeDiff(x.expireDate, x.createDate, true, undefined, 1);
               if(duration.toLowerCase().indexOf("now") >= 0)
                  duration = "instant";
               multiSwap(bnt, {
                  admin : users[x.createUserId].username,
                  adminlink : Links.User(x.createUserId),
                  banned : users[x.bannedUserId].username,
                  bannedlink : Links.User(x.bannedUserId),
                  type : x.type,
                  message : x.message,
                  duration : duration,
                  date : x.createDate
               });
               finalizeTemplate(bnt);
               banhistory.appendChild(bnt);
            });

            if(data.ban.length != 1000)
               hide(loadbans);
         });
      };
   }); 
}

function routecategory_load(spadat)
{
   var cid = Number(spadat.id);
   var params = new URLSearchParams();
   params.append("requests", "content-" + JSON.stringify({
      "parentIds" : [cid], 
      "sort" : "editDate",
      "reverse" : true,
      "nottypes" : [ "userpage" ],
      "limit": getLocalOption("pagedisplaylimit")
   }));
   params.append("requests", "category-" + JSON.stringify({"ComputeExtras":true}));
   //Need to make a SECOND content request
   params.append("requests", "content.1values_pinned-" + JSON.stringify({"parentIds":[cid]}));
   params.append("requests", "user.0createUserId.0edituserId.1createUserId.2createUserId");
   params.set("content", "id,name,type,parentId,createDate,editDate,createUserId,values,permissions");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see devlog for category data", apidata);

      var data = apidata.data;
      var c = idMap(data.category)[cid];

      if(!c)
      {
         pageerror("NOT FOUND", "Couldn't find category " + cid);
         return
      }

      c.childpages = data.content;

      route_complete(spadat, "Category: " + c.name, templ =>
      {
         templ.template.SetFields({
            category : c,
            deleteaction : (e) =>
            {
               if(confirm("Are you SURE you want to delete this category? ALL pages " +
                  "within will have an invalid parent and only be accessible through the API"))
               {
                  globals.api.Delete("category", cid, () => location.href = Links.Category(c.parentId));
               }
            },
         });
      }, getChain(data.category, c));
   });
}

function routepage_load(spadat)
{
   var initload = getLocalOption("initialloadcomments");
   var pid = Number(spadat.id);

   var params = new URLSearchParams();
   params.append("requests", "content-" + JSON.stringify({"ids" : [pid], "includeAbout" : true}));
   params.append("requests", "category");
   params.append("requests", "comment-" + JSON.stringify({
      "Reverse" : true,
      "Limit" : initload,
      "ParentIds" : [ pid ]
   }));
   params.append("requests", "user.0createUserId.0edituserId.2createUserId");
   params.set("category", "id,name,parentId,values");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see dev log for page data", apidata);

      var data = apidata.data;
      var c = data.content[0];

      if(!c)
      {
         pageerror("NOT FOUND", "Couldn't find page " + pid);
         return
      }

      route_complete(spadat, c.name, templ =>
      {
         templ.template.fields.page = c;
         finishPageControls(templ.template, c);
         maincontentinfo.appendChild(Templates.LoadHere("stdcontentinfo", {content:c}));
         finishDiscussion(c, data.comment, initload);
      }, getChain(data.category, c), c.id);
   });
}

function routecomments_load(spadat)
{
   var pid = Number(spadat.id);

   var params = new URLSearchParams();
   params.append("requests", "content-" + JSON.stringify({"ids" : [pid]}));
   params.append("requests", "category");
   params.append("requests", "user.0createUserId.0edituserId");
   params.set("category", "id,name,parentId,values");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see dev log for page data", apidata);

      var data = apidata.data;
      var c = data.content[0];

      if(!c)
      {
         pageerror("NOT FOUND", "Couldn't find page " + pid);
         return
      }

      route_complete(spadat, c.name, templ =>
      {
         //A mapping of parameters to template fields
         var paramMap = { 
            "start" : "createstart",
            "end" : "createend",
            "ids" : "searchids",
            "s" : "searchvalue"
         };
         var params = Object.keys(paramMap);

         var pagetempl = templ.template;
         var fields = {
            page : c,
            searchfunc : (v,t) => 
            {
               doCommentSearch(t, pagetempl);
               var args = {};
               params.forEach(x => {
                  if(pagetempl.fields[paramMap[x]])
                     args[x] = pagetempl.fields[paramMap[x]];
               });
               var url = Links.CommentSearch(c.id, args);
               history.pushState({"url" : url}, url, url);
            }
         };

         var hasparam = false;
         params.forEach(x =>
         {
            if(spadat.params.has(x))
            {
               fields[paramMap[x]] = spadat.params.get(x);
               hasparam = true;
            }
         });

         pagetempl.SetFields(fields);

         //If some parameter field was set, perform a search now!
         if(hasparam)
         {
            pagetempl.fields.loading = true;
            doCommentSearch(pagetempl.innerTemplates.genericsearch, pagetempl);
         }

      }, getChain(data.category, c));
   });
}

//This is EXTREMELY similar to pages, think about doing something different to
//minimize duplicate code???
function routeuser_load(spadat)
{
   var initload = getLocalOption("initialloadcomments");
   var uid = Number(spadat.id);

   var params = new URLSearchParams();
   params.append("requests", "user-" + JSON.stringify({"ids" : [uid]}));
   params.append("requests", "content-" + JSON.stringify({
      "createUserIds" : [uid],
      "type" : "userpage",
      "includeAbout" : true,
      "limit" : 1
   }));
   params.append("requests", "comment.1id$ParentIds-" + JSON.stringify({
      "Reverse" : true,
      "Limit" : initload
   }));
   params.append("requests", "content~pages-" + JSON.stringify({
      "createUserIds" : [uid],
      "nottypes" : ["userpage"],
      "sort" : "editDate",
      "reverse" : true
   }));
   params.append("requests", "user.1createUserId.1edituserId.2createUserId");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see dev log for user data", apidata);

      var data = apidata.data;
      var users = idMap(data.user);
      var u = users[uid];
      var c = data.content[0];

      if(!u)
      {
         pageerror("NOT FOUND", "Couldn't find user " + uid);
         return;
      }

      //This is to make breadcrumbs work I think
      u.name = u.username;
      u.link = Links.User(u.id);

      route_complete(spadat, "User: " + u.username, templ =>
      {
         templ.template.SetFields({
            user : u,
            page : c || false
         });

         //TODO: This needs to be handled by the template system later
         var history = templ.querySelector("[data-userhistory]");
         history.appendChild(makeActivity(s =>
         {
            s.userIds = [uid];
            return s;
         }, act =>
         {
            setHidden(history.querySelector("[data-title]"), !act.length);
         }));
         var pgelm = templ.querySelector("[data-userpages]");
         data.pages.forEach(x => pgelm.appendChild(Templates.LoadHere("pageitem", {page:x})));
         setHidden(pgelm.querySelector("[data-title]"), !data.pages.length);

         if(c)
         {
            finishPageControls(templ.template, c);
            maincontentinfo.appendChild(Templates.LoadHere("stdcontentinfo",{content:c}));
            finishDiscussion(c, data.comment, initload);
         }
      }, [u], c ? c.id : false);
   });
}

//TODO: Lots of repeated code between here and the template (because of the
//search template part). Consider somehow fixing this.
function routebrowse_load(spadat)
{
   var limit = getLocalOption("browsedisplaylimit");
   var searchparams = Utilities.GetParams(spadat.url);
   var csearch = { "limit": limit, "includeAbout" : true };

   //WHY did I make it like this? oh well
   var types = (searchparams.get("types") || "").split(",").filter(x => x).map(x => x.toLowerCase());
   csearch.nottypes = Object.keys(Templates._ttoic).filter(x => types.indexOf(x) < 0);
   
   if(searchparams.has("sort")) csearch.sort = searchparams.get("sort");
   if(searchparams.has("skip")) csearch.skip = searchparams.get("skip");
   if(searchparams.has("reverse")) csearch.reverse = searchparams.get("reverse") == "true";

   var params = new URLSearchParams();
   params.append("requests", "content-" + JSON.stringify(csearch));
   params.append("requests", "category");
   params.append("requests", "user.0createUserId.0edituserId");
   if(searchparams.get("watches") == "true")
      params.append("requests", "watch"); 
   params.set("category", "id,name,parentId,values");
   params.set("content", "id,name,about,type,parentId,createDate,editDate,createUserId,values,permissions");
   params.set("watch", "contentId");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see dev log for browse data", apidata);

      var data = apidata.data;

      route_complete(spadat, "Browse", templ =>
      {
         //TODO: This isn't fun to do and isn't very... good design, so think of a
         //way to make this better.
         var t = performance.now();
         if(data.watch)
            data.content = data.content.filter(x => data.watch.some(y => y.contentId == x.id));
         templ.template.SetFields({
            contents : data.content,
            params : searchparams,
            updateaction : (e) =>
            {
               e.preventDefault();
               var p = templ.template.fields.params;
               console.log(p.toString());
               p.set("p", "browse");
               globals.spa.ProcessLinkContextAware("?" + p.toString());
            }
         });
         templ.template.fields.contents.forEach(x => finishPageControls(x["_template"], x));
         log.PerformanceLog("Render content list took: " + (performance.now() - t) + "ms");
      });
   });
}

function routecategoryedit_load(spadat)
{
   var cid = Number(spadat.id);
   var params = new URLSearchParams();

   //Just ALWAYS pull all the categories, it's just a given
   params.append("requests", "category");

   //But pull special category data when we're editing (the user permissions)
   if(cid)
   {
      params.append("requests", "user.0permissions.0localsupers");
   }

   params.set("user", "id,username,avatar");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see devlog for categoryedit data", apidata);

      var data = apidata.data;
      var users = idMap(data.user);
      users[0] = Utilities.ShallowCopy(everyoneUser);
      var categories = idMap(data.category);

      var title = "Category: " + (cid ? cid : "New");
      var baseData = false;
      var newPid = Utilities.GetParams(spadat.url).get("pid");

      if(cid && categories[cid])
         baseData = categories[cid];

      route_complete(spadat, title, templ =>
      {
         multiSwap(templ, { 
            title : title
         });
         var cselect = templ.querySelector('[data-categoryselect]');
         cselect.appendChild(makeCategorySelect(data.category, cselect.getAttribute("name"), true));

         var lsupers = templ.querySelector('[data-localsupers]');
         lsupers.appendChild(makeUserCollection(lsupers.getAttribute("name")));

         var perms = templ.querySelector('[data-permissions]');
         perms.appendChild(makeUserCollection(perms.getAttribute("name"), true));

         if(baseData)
         {
            formFill(templ, baseData);

            baseData.localSupers.forEach(x => {
               if(users[x]) addPermissionUser(users[x],lsupers); });
            Object.keys(baseData.permissions).forEach(x => 
            {
               if(users[x]) addPermissionUser(users[x],perms, baseData.permissions[x]);
            });
         }
         else
         {
            addPermissionUser(users[0],perms, getLocalOption("defaultpermissions"));

            if(newPid !== null)
               formFill(templ, { "parentId": newPid });
         }


         formSetupSubmit(templ.querySelector("form"), "category", c =>
         {
            setLeaveProtect(false);
            globals.spa.ProcessLinkContextAware(Links.Category(c.id));
         }, false, baseData);
      }, baseData ? getChain(data.category, baseData) : undefined);
   });
}

function routepageedit_load(spadat)
{
   var pid = Number(spadat.id);
   var params = new URLSearchParams();

   //Just ALWAYS pull all the categories, it's just a given
   params.append("requests", "category");

   //But pull special page data when we're editing (the user permissions)
   if(pid)
   {
      params.append("requests", "content-" + JSON.stringify({ids:[pid]}));
      params.append("requests", "user.1permissions.1createuserid.1edituserid");
   }

   params.set("user", "id,username,avatar");
   params.set("category", "id,name,parentId");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see devlog for pageedit data", apidata);

      var data = apidata.data;
      var users = idMap(data.user);
      users[0] = Utilities.ShallowCopy(everyoneUser);
      var categories = idMap(data.category);
      var content = idMap(data.content);

      var title = "Page: " + (pid ? pid : "New");
      var baseData = false;
      var newPid = Utilities.GetParams(spadat.url).get("pid");
      var newType = Utilities.GetParams(spadat.url).get("type");

      if(pid && content[pid])
         baseData = content[pid];

      route_complete(spadat, title, templ =>
      {
         //Need to pull in the widgets, hope it's ok
         finalizeTemplate(templ);

         multiSwap(templ, { 
            title : title
         });
         var cselect = templ.querySelector('[data-categoryselect]');
         cselect.appendChild(makeCategorySelect(data.category, cselect.getAttribute("name"), true));

         var perms = templ.querySelector('[data-permissions]');
         perms.appendChild(makeUserCollection(perms.getAttribute("name"), true));

         var imgselect = templ.querySelector('[data-imageselect]');
         imgselect.appendChild(makeImageCollection(imgselect.getAttribute("name")));

         var cntimage = templ.querySelector('[data-contentimage]');
         cntimage.addEventListener("click", e => 
         {
            e.preventDefault();
            globals.fileselectcallback = id => 
            {
               var cnttxt = cntimage.previousElementSibling;
               Utilities.InsertAtCursor(cnttxt, getComputedImageLink(id));
            };
         });

         var refreshForm = (c) =>
         {
            //TODO: Change this to css!
            c = c || formSerialize(templ, baseData);
            var isUserpage = c.type === "userpage";
            setHidden(templ.querySelector("[data-pagetype]"), isUserpage);
            setHidden(templ.querySelector("[data-pagename]"), isUserpage);
            setHidden(templ.querySelector("[data-pagecategory]"), isUserpage);

            var isProgram = c.type === "program";
            setHidden(templ.querySelector("[data-pageimages]"), !isProgram);
            setHidden(templ.querySelector("[data-pagekey]"), !isProgram);
            setHidden(templ.querySelector("[data-pagesystem]"), !isProgram);

            if(isUserpage)
            {
               formFill(templ, {"name" : getUsername() + "'s userpage"});
               findSwap(templ, "title", getUsername() + ": Userpage");
            }
            else
            {
               findSwap(templ, "title", title);
            }
         };

         var imgthm = templ.querySelector("[data-thumbnail]");
         var rmvthm = templ.querySelector("[data-thumbnailremove]");
         var slcthm = templ.querySelector("[data-thumbnailselect]");

         var setThumbnail = (id) =>
         {
            imgthm.setAttribute("data-value", id);
            imgthm.src = getComputedImageLink(id, 200);
            unhide(rmvthm);
            hide(slcthm);
         };

         rmvthm.onclick = (e) =>
         {
            e.preventDefault();
            imgthm.setAttribute("data-value", "");
            imgthm.src = "";
            unhide(slcthm);
            hide(rmvthm);
         };

         slcthm.addEventListener('click', (e) =>
         {
            e.preventDefault();
            globals.fileselectcallback = setThumbnail;
         });

         templ.querySelector('[data-preview]').onclick = (e) =>
         {
            e.preventDefault();
            var form = formSerialize(templ, baseData);
            displayPreview(form.name, form.content, form.values.markupLang);
         };

         templ.querySelector('[name="type"]').oninput = (e) => refreshForm();

         if(baseData)
         {
            formFill(templ, baseData);

            Object.keys(baseData.permissions).forEach(x => {
               if(users[x]) addPermissionUser(users[x],perms, baseData.permissions[x]);
            });

            (baseData.values.photos || "").split(",").filter(x => x).forEach(x => addImageItem(x, imgselect));

            var thm = Number(baseData.values.thumbnail);
            if(thm) setThumbnail(thm);

            refreshForm();
         }
         else
         {
            addPermissionUser(users[0],perms, getLocalOption("defaultpermissions"));
            var newfill = {};

            if(newPid !== null)
               newfill.parentId = newPid;
            if(newType !== null)
               newfill.type = newType;

            formFill(templ, newfill);
            refreshForm();
         }

         formSetupSubmit(templ.querySelector("form"), "content", p =>
         {
            setLeaveProtect(false);
            if(p.type === "userpage")
               globals.spa.ProcessLinkContextAware(Links.User(p.createUserId));
            else
               globals.spa.ProcessLinkContextAware(Links.Page(p.id));
         }, false, baseData);
      }, baseData ? getChain(data.category, baseData) : undefined);
   });
}

