[out:json][timeout:300];
(
  way["building"](40.7450,-74.0100,40.7700,-73.9750);
  relation["building"](40.7450,-74.0100,40.7700,-73.9750);
  way["highway"~"^(primary|secondary|tertiary|residential|trunk|motorway|unclassified|service|pedestrian)$"](40.7450,-74.0100,40.7700,-73.9750);
  way["natural"="coastline"](40.7300,-74.0400,40.7800,-73.9600);
  way["leisure"="park"](40.7450,-74.0100,40.7700,-73.9750);
  way["railway"](40.7450,-74.0100,40.7700,-73.9750);
);
out geom;
