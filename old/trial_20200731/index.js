// The main js for the website or something
// Started 7-30-2020
window.onload = function()
{
   setupResize(paneresizer);
};

//Eventually these will be generic. For now, don't bother.
function setupResize(resizer, left, right, min)
{
   resizer.addEventListener("mousedown", function(e)
   {
      console.log("Mouse down", e);
   });
}
