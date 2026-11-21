[out:json][timeout:300];
rel["boundary"="administrative"]["admin_level"~"^(6|7)$"]["name"~"^(Manhattan|Brooklyn|Queens|The Bronx|Bronx|Staten Island|New York County|Kings County|Queens County|Bronx County|Richmond County)$"](40.45,-74.30,40.95,-73.65);
out geom;
way["natural"="coastline"](40.47,-74.29,40.93,-73.68);
out geom;
