How to use the astrometry.net plate solver with Ubuntu Linux

Here are some simple instructions to set up the astrometry.net plate solving software in Unbutu Linux, and run it from the command line. Given an image of the night sky, plate solving software will identify the stars, constellations and other objects in the image. There are other ways to use this solver, e.g., by uploading your image to the astrometry.net web service, or using the web API, but it's often faster and simpler to run it locally, and one can script it's usage with other steps in the astrophotography image processing pipeline (like stacking).

Tested on Ubuntu 18.04, September 2019.

    Install the astrometry package:

     sudo apt-get install astrometry.net

    Install the astrometry data:

     sudo apt-get install astrometry-data-tycho2

    There's also the package astrometry-data-2mass, but the tycho2 package seems to work just fine.
    Aside: to see all the astrometry packages, type

     sudo apt-cache search astrometry

    Run the plate solver:

     solve-field input-image.tif

    The input file is a TIF file output by DeepSkyStacker (other formats are probably supported as well). This will produce the annotated image files displayed when you upload an image to nova.astrometry.net and some other metadata. There's about twelve output files, so the -D flag is helpful:

      solve-field -D solve-output input-image.tif

    since it will put all the files in the specified directory (solve-output in this example), creating it first if it doesn't exist.
    View the output. The file input-image-ngc.png is the one I find most useful it shows the constellations (stick figures) and star names.
    Read the manual page for more info, there are tons of interesting options to experiment with.

    man solve-field

Example files

Here's an example you can use to test your setup. It's an extremely boring image of the star Arcturus. I converted the TIF file to JPG to make it much smaller, and viewable in your browser. It will work with solve-field.
Input file: input-image.jpg
Output file: input-image-ngc.png

Clear skies and happy plate solving :)