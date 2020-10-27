//All the templates

//Template loader doesn't care whether it's from html or generated from
//javascript, it just needs you to produce an object with getter/setters for
//things. A template is just a fancy object.

//Hmm... perhaps make generic template loader so it can be swapped out, but
//implement it with the index for main website. This way people can easily
//swap out the templates with their own. Make sure there's a preload function
//on every template so users can keep all the functionality but only alter the
//html. Hmmmmm

var Templates = Object.create(null); with (Templates) (function($) { Object.assign(Templates, 
   
   //Get the template from the index, initializing all the inner crap etc. All
   //my templates should be this, you can add other templates ofc.
   StdTemplate : function(template)
   {

   },

   LoadTemplate : function(template)
   {
      //look inside yourself
   }
})
//Private vars can go here
}(window));

