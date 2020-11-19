
//Name is the actual command
function Command(description, process)
{
   this.description = description;
   this.process = process;
}

//These need to be injected
var CommandSystem = {
   api : false,
   message : (modmsg) => console.log("Not handling: ", msg),
   print : (msg) => CommandSystem.message({message:msg})
};

var Commands = { 
   hide : new Command("Disappear from chat userlists", cmd =>
   {
      CommandSystem.print("Contacting server to hide...");
      CommandSystem.api.Get("user/me", "", apidat =>
      {
         var hidelist = apidat.data.hidelist;
         if(hidelist.indexOf(0) >= 0)
         {
            CommandSystem.print("Already hiding");
            return;
         }
         hidelist.push(0);
         CommandSystem.api.Put("user/basic", {hidelist:hidelist}, apidat =>
         {
            CommandSystem.print("Now hiding, it may take a few seconds for you to disappear from the userlist");
         });
      });
   }),
   unhide : new Command("Show up as normal in chat userlists", cmd =>
   {
      CommandSystem.print("Contacting server to unhide...");
      CommandSystem.api.Get("user/me", "", apidat =>
      {
         var hidelist = apidat.data.hidelist;
         if(hidelist.indexOf(0) < 0)
         {
            CommandSystem.print("Already visible");
            return;
         }
         CommandSystem.api.Put("user/basic", {hidelist:hidelist.filter(x => x != 0)}, apidat =>
         {
            CommandSystem.print("Now visible");
         });
      });
   })
};
