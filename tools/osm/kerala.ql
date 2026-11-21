[out:json][timeout:300];
area["ISO3166-2"="IN-KL"]->.k;
(
  rel["ISO3166-2"="IN-KL"];
  rel(area.k)["boundary"="administrative"]["admin_level"="5"];
);
out geom;
node(area.k)["place"~"^(city|town)$"];
out;
