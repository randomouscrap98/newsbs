
//Name is the actual command
function Command(description, process)
{
   this.description = description;
   this.process = process;
}

var CommandSystem = {
   _history : [],
   _historyMax : 100,
   addHistory : (cmd) =>
   {
      CommandSystem._history.push(cmd);
      while(CommandSystem._history.length > CommandSystem._historyMax)
         CommandSystem._history.shift();
   },
   //These need to be injected
   api : false,
   message : (modmsg) => console.log("Not handling: ", msg),
   print : (msg) => CommandSystem.message({message:msg}),
   realmessage : (msg, format, error) => {throw "No implementation for realmessage!"},
   commandinput : false
};

var Commands = { 
   hide : new Command("Disappear from all chat userlists (Use '/hide here' to hide from the current room instead)", cmd =>
   {
      var targetpage;
      if (cmd.includes("here"))
      {
         targetpage = getActiveDiscussionId();
      }
      else
      {
         targetpage = 0
      }
      if (targetpage == null) return;
      CommandSystem.print("Contacting server to hide...");
      CommandSystem.api.Get("user/me", "", apidat =>
      {
         var hidelist = apidat.data.hidelist;
         if(hidelist.indexOf(targetpage) >= 0)
         {
            CommandSystem.print("Already hiding");
            return;
         }
         hidelist.push(targetpage);
         CommandSystem.api.Put("user/basic", {hidelist:hidelist}, apidat =>
         {
            CommandSystem.print("Now hiding, it may take a few seconds for you to disappear from the userlist");
         });
      });
   }),
   unhide : new Command("Show up as normal in all chat userlists (Use '/hide here' to hide from the current room instead)", cmd =>
   {
      var targetpage;
      if (cmd.includes("here"))
      {
         targetpage = getActiveDiscussionId();
      }
      else
      {
         targetpage = 0
      }
      if (targetpage == null) return;
      CommandSystem.print("Contacting server to unhide...");
      CommandSystem.api.Get("user/me", "", apidat =>
      {
         var hidelist = apidat.data.hidelist;
         if(hidelist.indexOf(targetpage) < 0)
         {
            CommandSystem.print("Already visible");
            return;
         }
         CommandSystem.api.Put("user/basic", {hidelist:hidelist.filter(x => x != targetpage)}, apidat =>
         {
            CommandSystem.print("Now visible");
         });
      });
   }),
   memoryusage : new Command("Check server memory usage estimate (not highly accurate)", cmd =>
   {
      CommandSystem.print("Contacting server to check memory...");
      CommandSystem.api.Get("test/memory", "", apidat =>
      {
         CommandSystem.print(`Server memory usage: ${apidat.data>>20}mb`);
      });
   }),
   garbagecollect : new Command("(Super only): Perform deep garbage collection on server", cmd =>
   {
      CommandSystem.print("Contacting server to garbage collect...");
      CommandSystem.api.Get("test/gc", "", apidat =>
      {
         CommandSystem.print(`Garbage collection complete! ${apidat.data.memoryBefore>>20}mb -> ${apidat.data.memoryAfter>>20}mb`);
      });
   }),
   plaintext : new Command("Send message as plaintext", cmd =>
   {
      CommandSystem.realmessage(cmd.substr(cmd.indexOf(" ") + 1), "plaintext", error =>
      {
         postdiscussiontext.value = cmd;
      });
   }),
   loadmodulemessages : new Command("Load module messages up to the given number of hours ago (default: 12)", cmd =>
   {
      var hours = Number(cmd.match(/\d+/) || 12);
      CommandSystem.print(`Pulling module messages from the last ${hours} hours...`);
      var params = new URLSearchParams();
      var search = {"reverse":true,"createstart":Utilities.SubHours(hours).toISOString()};
      params.append("requests", "modulemessage-" + JSON.stringify(search));
      params.append("requests", "user.0usersInMessage.0sendUserId"); 
      CommandSystem.api.Chain(params, apidata =>
      {
         var data = apidata.data;
         updateModuleMessages(data); //TODO: This requires direct access to index.js...
         CommandSystem.print(`Finished pulling module messages from the last ${hours} hours; they were inserted in chronological order`);
      });
   }),
   ".." : new Command("Fill text area with last command", (cmd, parts) =>
   {
      var backIndex = 1;
      if(parts.length > 0)
      {
         var backMore = parseInt(parts[0]);
         if(!isNaN(backMore))
            backIndex += backMore;
      }

      var index = CommandSystem._history.length - 1 - backIndex;

      if(index >= 0 && index < CommandSystem._history.length)
         CommandSystem.commandinput.value = "/" + CommandSystem._history[index];
      else
         CommandSystem.print("No command at history " + backIndex);
   })
};
