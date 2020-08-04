#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define ENDCONFIG "---"
#define REPLACEMENTBUFFER 100000
//Because of weirdness, divide by two to get actual
#define MAXREPLACEMENTS 2000
#define MAXKEY 100
#define MAXVALUE 2000

int main()
{
   //Get EVERYTHING from stdin. Also yeah static allocation, bite me
   char replbuf[REPLACEMENTBUFFER];
   char * rbf = replbuf;

   char * repl[MAXREPLACEMENTS];
   int replc = 0;

   char key[MAXKEY];
   char value[MAXVALUE];
   char temp[MAXVALUE];
   int scanc = 0;
   
   //Config reading loop
   while(1)
   {
      scanc = scanf("%s", key);

      if(scanc != 1 || strcmp(ENDCONFIG, key) == 0)
         break;

      scanc = scanf(" %1999[^\n]", value);
      
      if(scanc != 1)
      {
         fprintf(stderr, "Invalid config format, no value found for %s", key);
         return 2;
      }

      sprintf(rbf, "%%%s%%", key);
      repl[replc++] = rbf;
      rbf += (strlen(key) + 3);

      strcpy(rbf, value);
      repl[replc++] = rbf;
      rbf += (strlen(value) + 1);
   }

   //Line reading + replacement loop
   while(1)
   {
      scanc = scanf("%c%1999[^\n]", &temp[0], value);

      //Replace on line
      if(scanc == 2)
      {
         //Search through every replacement
         for(int i = 0; i < replc; i += 2)
         {
            char * rep = strstr(value, repl[i]);

            if(rep)
            {
               //Copy the end of the string so it doesn't get written over
               strcpy(temp, rep + strlen(repl[i]));
               //Replace
               strcpy(rep, repl[i+1]);
               //Put old string back + end the string (automatic)
               strcpy(rep + strlen(repl[i+1]), temp);
               i = -2; //Restart the replacements
            }
         }

         printf("%s\n", value);
      }
      else
      {
         break;
      }
   }
}
