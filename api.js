
var apiroot = "https://newdev.smilebasicsource.com/api";

// *************
// ---- API ----
// *************

function quickApi(url, callback, error, postData, always, method, modify, nolog)
{
   let thisreqid = ++globals.reqId;
   var endpoint = url; var epquery = url.indexOf("?");
   if(epquery >= 0) endpoint = endpoint.substr(0, epquery);

   url = apiroot + "/" + url;
   error = error || (e => notifyError("Error on " + url + ":\n" + e.status + " - " + e.responseText));

   method = method || (postData ? "POST" : "GET");

   if(!nolog)
      log.Info("[" + thisreqid + "] " + method + ": " + url);

   var req = new XMLHttpRequest();

   var apidat = { id: thisreqid, url: url, endpoint: endpoint, method : method, request : req};

   //This is supposedly thrown before the others
   req.addEventListener("error", function() { req.networkError = true; });
   req.addEventListener("loadend", function()
   {
      log.Debug("[" + thisreqid + "]: " + req.status + " " + req.statusText + 
         " (" + req.response.length + "b) " + endpoint);
      if(always) 
         always(req);
      if(req.status <= 299 && req.status >= 200)
      {
         if(callback)
            callback(req.responseText ? JSON.parse(req.responseText) : null);
         else
            notifySuccess("Success: " + req.status + " - " + req.responseText);
      }
      else
      {
         //Also thrown on network error
         error(req);
      }
      signals.Add("apiend", apidat);
   });

   req.open(method, url);
   req.setRequestHeader("accept", "application/json");
   req.setRequestHeader("Content-Type", "application/json");

   var token = getToken(); //Do this as late as possible "just in case" (it makes no difference though)
   if(token)
      req.setRequestHeader("Authorization", "Bearer " + token);

   if(modify)
      modify(req);

   signals.Add("apistart", apidat);

   if(postData)
      req.send(JSON.stringify(postData));
   else
      req.send();
}

// **********************
// ---- LONG POLLING ----
// **********************

function tryAbortLongPoller()
{
   if(globals.longpoller.pending)
   {
      log.Debug("Aborting old long poller...");
      globals.longpoller.pending.abort();
      return true;
   }

   return false;
}

function updateLongPoller()
{
   log.Info("Updating long poller, may restart");

   //Just always abort, if they want an update, they'll GET one
   tryAbortLongPoller();

   if(!getToken())
      return;

   var cid = getActiveDiscussion();

   //A full reset haha great
   if(cid)
   {
      globals.longpoller.lastlisteners = { };
      globals.longpoller.lastlisteners[String(cid)] = { "0" : "" }; 
   }
   else
   {
      globals.longpoller.lastlisteners = null;
   }

   longpollRepeater();
}

function longpollRepeater()
{
   setConnectionState("connected");

   var statuses = {};
   var cid = getActiveDiscussion();
   if(cid) statuses[String(cid)] = "online";
   var clearNotifications = Object.keys(statuses).map(x => Number(x));

   var params = new URLSearchParams();
   params.append("actions", JSON.stringify({
      "lastId" : globals.lastsystemid,
      "statuses" : statuses,
      "clearNotifications" : clearNotifications,
      "chains" : [ "comment.0id", "activity.0id", "watch.0id",
         "user.1createUserId.2userId", "content.1parentId.2contentId.3contentId" ]
   }));

   if(globals.longpoller.lastlisteners)
   {
      params.append("listeners", JSON.stringify({
         "lastListeners" : globals.longpoller.lastlisteners,
         "chains" : [ "user.0listeners" ]
      }));
   }

   params.set("user","id,username,avatar");
   params.set("content","id,name");

   quickApi("read/listen?" + params.toString(), data => //success
   {
      if(data)
      {
         globals.lastsystemid = data.lastId;

         var users = idMap(data.chains.user);
         var watchlastids = getWatchLastIds();
         updatePulse(data.chains);

         if(data.chains.comment)
         {
            //I filter out comments from watch updates if we're currently in
            //the room. This should be done automatically somewhere else... mmm
            data.chains.commentaggregate = commentsToAggregate(
               data.chains.comment.filter(x => watchlastids[x.parentId] < x.id && 
                  clearNotifications.indexOf(x.parentId) < 0));
            handleAlerts(data.chains.comment, users);
            easyComments(data.chains.comment, users);
         }

         if(data.chains.activity)
         {
            data.chains.activityaggregate = activityToAggregate(
               data.chains.activity.filter(x => watchlastids[x.contentId] < x.id &&
                  clearNotifications.indexOf(x.contentId) < 0));
         }

         console.datalog("watchlastids: ", watchlastids);
         console.datalog("chatlisten: ", data);
         updateWatches(data.chains);

         if(data.listeners)
         {
            globals.longpoller.lastlisteners = data.listeners;
            updateDiscussionUserlist(data.listeners, users);
         }
      }

      longpollRepeater();

   }, req => //error
   {
      if(req.status === 400)
      {
         setConnectionState("error");
         UIkit.modal.confirm("Live updates cannot recover from error. " +
            "Press OK to reload page.\n\nIf you " +
            "CANCEL, the website will not function properly!").then(x =>
         {
            location.reload();
         });
      }
      else if(req.status || req.networkError)
      {
         setConnectionState("error");
         var lpr = getLocalOption("longpollerrorrestart");
         log.Error("Long poller failed, status: " + req.status + ", retrying in " + lpr + " ms");
         setTimeout(longpollRepeater, lpr);
      }
      else
      {
         setConnectionState("aborted");
         log.Warn("Long poller was aborted!");
      }
   }, undefined, req => //Always
   {
      globals.longpoller.pending = false;
   }, undefined, req => //modify
   {
      globals.longpoller.pending = req;
   }, !getLocalOption("loglongpollrequest") /* Do we want this? No logging? */);
}

// ****************
// --- ENDPOINT ---
// ****************

function getUserLink(id) { return "?p=user-" + id; }
function getPageLink(id) { return "?p=page-" + id; }
function getCategoryLink(id) { return "?p=category-" + id; }

function getImageLink(id, size, crop, ignoreRatio)
{
   var img = apiroot + "/file/raw/" + id;
   var linkch = "?";
   if(size) { img += linkch + "size=" + size; linkch = "&"; }
   if(crop) { img += linkch + "crop=true"; linkch = "&"; }
   return img;
}

// *******************
// --- DATA FORMAT ---
// *******************

function commentsToAggregate(comment)
{
   var comments = {};

   if(comment)
   {
      comment.forEach(c =>
      {
         if(!comments[c.parentId]) 
            comments[c.parentId] = { "lastDate" : "0", "count" : 0, "userIds" : [], "id" : c.parentId};
         var cm = comments[c.parentId];
         if(cm.userIds.indexOf(c.createUserId) < 0) cm.userIds.push(c.createUserId);
         if(c.createDate > cm.lastDate) cm.lastDate = c.createDate;
         cm.count++;
      });
   }

   return Object.values(comments);
}

function activityToAggregate(activitee)
{
   var activity = {};

   if(activitee)
   {
      activitee.forEach(a =>
      {
         if(!activity[a.contentId]) 
            activity[a.contentId] = { "lastDate" : "0", "count" : 0, "userIds" : [], "id" : a.contentId};
         var ac = activity[a.contentId];
         if(ac.userIds.indexOf(a.userId) < 0) ac.userIds.push(a.userId);
         if(a.date > ac.lastDate) ac.lastDate = a.date;
         ac.count++;
      });
   }

   return Object.values(activity);
}

// *********************
// --- FRONTEND COOP ---
// *********************

function parseComment(content) {
   var newline = content.indexOf("\n");
   try {
      // try to parse the first line as JSON
      var data = JSON.parse(newline>=0 ? content.substr(0, newline) : content);
   } finally {
      if (data && data.constructor == Object) { // new or legacy format
         if (newline >= 0)
            data.t = content.substr(newline+1); // new format
      } else // raw
         data = {t: content};
      return data;
   }
}

function createComment(rawtext, markup) {
   return JSON.stringify({"m":markup}) + "\n" + rawtext;
}

//Does the given (agreed upon) page name type have discussions? This would be
//user, page, category, etc (those names)
function typeHasDiscussion(type) {
   return type === "page" || type === "user";
}
