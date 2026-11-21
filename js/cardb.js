'use strict';
// ---------------------------------------------------------------------------
// Real-world car catalogue + physics derivation.
// Each line: Name | body | hp | curb kg | top km/h | 0-100 km/h s | drive | L | W | H (m)
// Figures are manufacturer/published approximations.
// Bodies: super, sports (use the real 3D model), coupe, muscle, sedan, hatch,
//         wagon, suv, pickup, van (use shaped procedural bodies).
// ---------------------------------------------------------------------------
const CAR_DB_RAW = `
Royal Enfield Classic 350|bike|20|195|114|12.5|RWD|2.15|0.79|1.09
Kawasaki Ninja H2|bike|228|238|300|2.6|RWD|2.09|0.77|1.13
Yamaha YZF-R1|bike|198|201|299|2.9|RWD|2.06|0.69|1.17
Ducati Panigale V4 R|bike|218|193|305|2.6|RWD|2.07|0.76|1.14
Suzuki Hayabusa|bike|187|264|299|3.2|RWD|2.18|0.74|1.17
Kawasaki Z1000|bike|140|221|250|3.0|RWD|2.05|0.79|1.06
Ferrari 458 Italia|super|562|1485|325|3.4|RWD|4.53|1.94|1.21
Ferrari 488 GTB|super|661|1475|330|3.0|RWD|4.57|1.95|1.21
Ferrari F8 Tributo|super|710|1435|340|2.9|RWD|4.61|1.98|1.21
Ferrari SF90 Stradale|super|986|1570|340|2.5|AWD|4.71|1.97|1.19
Ferrari 296 GTB|super|819|1470|330|2.9|RWD|4.57|1.96|1.19
Ferrari 812 Superfast|super|789|1630|340|2.9|RWD|4.66|1.97|1.28
Ferrari LaFerrari|super|950|1255|350|2.4|RWD|4.70|1.99|1.12
Ferrari Enzo|super|651|1365|350|3.3|RWD|4.70|2.04|1.15
Ferrari F40|super|471|1100|324|4.1|RWD|4.36|1.97|1.12
Ferrari Testarossa|super|385|1500|290|5.2|RWD|4.49|1.98|1.13
Ferrari Roma|sports|612|1570|320|3.4|RWD|4.66|1.97|1.30
Lamborghini Huracan EVO|super|631|1422|325|2.9|AWD|4.52|1.93|1.17
Lamborghini Huracan STO|super|631|1339|310|3.0|RWD|4.55|1.95|1.22
Lamborghini Aventador SVJ|super|759|1525|350|2.8|AWD|4.94|2.10|1.14
Lamborghini Revuelto|super|1001|1772|350|2.5|AWD|4.95|2.03|1.16
Lamborghini Countach LPI 800-4|super|803|1595|355|2.8|AWD|4.87|2.10|1.14
Lamborghini Countach LP400|super|375|1065|290|5.6|RWD|4.14|1.89|1.07
McLaren 720S|super|710|1419|341|2.9|RWD|4.54|1.93|1.20
McLaren 750S|super|740|1389|332|2.8|RWD|4.57|1.93|1.20
McLaren Artura|super|671|1498|330|3.0|RWD|4.54|1.98|1.19
McLaren P1|super|903|1395|350|2.8|RWD|4.59|1.95|1.19
McLaren Senna|super|789|1198|340|2.8|RWD|4.74|1.96|1.23
McLaren GT|sports|612|1530|326|3.2|RWD|4.68|2.05|1.21
Porsche 918 Spyder|super|887|1634|345|2.6|AWD|4.64|1.94|1.17
Porsche Carrera GT|super|603|1380|330|3.9|RWD|4.61|1.92|1.17
Bugatti Veyron 16.4|super|1001|1888|407|2.5|AWD|4.46|2.00|1.21
Bugatti Chiron|super|1479|1996|420|2.4|AWD|4.54|2.04|1.21
Koenigsegg Jesko|super|1603|1420|480|2.5|RWD|4.61|2.03|1.21
Koenigsegg Regera|super|1500|1590|410|2.8|RWD|4.56|2.05|1.11
Pagani Huayra|super|730|1350|383|3.0|RWD|4.61|2.04|1.17
Pagani Zonda F|super|602|1230|345|3.6|RWD|4.44|2.06|1.14
Aston Martin Valkyrie|super|1139|1355|350|2.5|RWD|4.51|1.92|1.07
Ford GT|super|660|1385|348|3.0|RWD|4.76|2.00|1.11
Ford GT40 Mk I|super|485|1000|330|4.2|RWD|4.29|1.78|1.03
Mercedes-AMG One|super|1049|1695|352|2.9|AWD|4.76|2.01|1.26
Rimac Nevera|super|1914|2300|412|1.9|AWD|4.75|1.99|1.21
Lotus Evija|super|1973|1680|350|2.0|AWD|4.46|2.00|1.12
Gordon Murray T.50|super|654|986|340|2.8|RWD|4.35|1.85|1.16
Audi R8 V10 Performance|super|611|1595|331|3.1|AWD|4.43|1.94|1.24
Lexus LFA|super|553|1480|325|3.7|RWD|4.51|1.90|1.22
Maserati MC20|super|621|1500|325|2.9|RWD|4.67|1.97|1.22
Chevrolet Corvette Z06 C8|super|670|1660|315|2.6|RWD|4.68|2.03|1.23
Honda NSX Type S|super|600|1725|307|2.9|AWD|4.49|1.94|1.21
Dodge Viper ACR|super|645|1527|285|3.5|RWD|4.46|1.96|1.25
Porsche 911 Carrera 4S|sports|443|1565|306|3.6|AWD|4.52|1.85|1.30
Porsche 911 Carrera S|sports|443|1515|308|3.5|RWD|4.52|1.85|1.30
Porsche 911 Turbo S|sports|641|1640|330|2.7|AWD|4.54|1.90|1.30
Porsche 911 GT3|sports|503|1435|318|3.4|RWD|4.57|1.85|1.28
Porsche 718 Cayman GT4|sports|414|1420|304|4.4|RWD|4.46|1.80|1.27
Porsche 718 Boxster S|sports|345|1385|285|4.2|RWD|4.38|1.80|1.28
Porsche 911 Carrera RS 2.7|sports|210|1075|245|5.8|RWD|4.15|1.65|1.32
Chevrolet Corvette Stingray C8|sports|495|1530|312|3.0|RWD|4.63|1.93|1.23
Mercedes-AMG GT R|sports|577|1630|318|3.6|RWD|4.55|2.01|1.28
Mercedes-AMG SL 63|sports|577|1970|315|3.6|AWD|4.71|1.92|1.35
Aston Martin Vantage|sports|656|1605|325|3.4|RWD|4.50|1.98|1.27
Aston Martin DB12|sports|671|1685|325|3.5|RWD|4.73|1.98|1.30
Aston Martin DBS Superleggera|sports|715|1693|340|3.4|RWD|4.71|1.97|1.28
Bentley Continental GT Speed|sports|650|2273|335|3.6|AWD|4.85|1.95|1.40
Jaguar F-Type R|sports|575|1745|300|3.7|AWD|4.47|1.92|1.31
Lotus Emira|sports|400|1405|290|4.3|RWD|4.41|1.90|1.23
Lotus Exige Sport 390|sports|397|1110|277|3.7|RWD|4.08|1.80|1.13
Alpine A110 S|sports|296|1109|275|4.2|RWD|4.18|1.80|1.25
Lexus LC 500|sports|471|1935|270|4.4|RWD|4.77|1.92|1.35
Nissan GT-R Nismo|sports|600|1720|315|2.5|AWD|4.69|1.90|1.37
Nissan GT-R Premium|sports|565|1752|315|2.9|AWD|4.71|1.90|1.37
Audi R8 V10|sports|562|1595|324|3.4|AWD|4.43|1.94|1.24
BMW i8|sports|369|1535|250|4.4|AWD|4.69|1.94|1.29
BMW M8 Competition|sports|617|1885|305|3.2|AWD|4.87|1.91|1.36
Jaguar E-Type Series 1|sports|265|1230|241|7.0|RWD|4.45|1.66|1.22
Mercedes-Benz 300SL Gullwing|sports|215|1295|260|9.0|RWD|4.52|1.79|1.30
DeLorean DMC-12|sports|130|1230|210|9.5|RWD|4.27|1.86|1.14
Honda NSX 1991|sports|270|1365|270|5.7|RWD|4.40|1.81|1.17
Toyota GR Supra 3.0|coupe|382|1540|250|4.1|RWD|4.38|1.85|1.29
Toyota GR86|coupe|228|1270|226|6.3|RWD|4.27|1.78|1.31
Toyota Supra MK4 Turbo|coupe|320|1570|250|4.6|RWD|4.52|1.81|1.28
Toyota AE86 Corolla Levin|coupe|128|940|200|8.5|RWD|4.18|1.63|1.33
Mazda MX-5 Miata|coupe|181|1060|219|5.7|RWD|3.92|1.73|1.23
Mazda RX-7 FD|coupe|276|1280|250|5.3|RWD|4.29|1.76|1.23
Nissan Z|coupe|400|1590|250|4.5|RWD|4.38|1.85|1.31
Nissan 370Z|coupe|332|1496|250|5.2|RWD|4.26|1.84|1.32
Nissan Skyline GT-R R34|coupe|276|1560|250|4.9|AWD|4.60|1.79|1.36
Subaru BRZ|coupe|228|1280|226|6.1|RWD|4.27|1.78|1.31
Honda S2000|coupe|237|1260|240|6.2|RWD|4.12|1.75|1.27
BMW M2|coupe|453|1725|285|4.1|RWD|4.58|1.89|1.40
BMW M4 Competition|coupe|503|1725|290|3.9|RWD|4.80|1.89|1.39
BMW Z4 M40i|coupe|382|1535|250|4.5|RWD|4.32|1.86|1.30
BMW E30 M3|coupe|195|1200|235|6.7|RWD|4.35|1.68|1.37
Audi TT RS|coupe|394|1450|280|3.7|AWD|4.19|1.83|1.34
Audi RS5 Coupe|coupe|444|1715|280|3.9|AWD|4.72|1.86|1.37
Rolls-Royce Wraith|coupe|624|2360|250|4.4|RWD|5.28|1.95|1.51
Chevrolet Camaro ZL1|muscle|650|1765|318|3.5|RWD|4.84|1.90|1.35
Chevrolet Camaro SS|muscle|455|1680|265|4.0|RWD|4.78|1.90|1.35
Dodge Challenger SRT Hellcat|muscle|717|2050|320|3.6|RWD|5.02|1.92|1.45
Dodge Challenger R/T|muscle|375|1890|230|5.6|RWD|5.02|1.92|1.45
Ford Mustang GT|muscle|480|1750|250|4.3|RWD|4.81|1.92|1.40
Ford Mustang Shelby GT500|muscle|760|1915|290|3.5|RWD|4.82|1.92|1.38
Ford Mustang EcoBoost|muscle|315|1600|240|5.0|RWD|4.81|1.92|1.40
Pontiac Firebird Trans Am 1977|muscle|200|1680|190|8.5|RWD|5.00|1.85|1.27
Chevrolet Chevelle SS 454|muscle|450|1750|210|6.0|RWD|5.00|1.93|1.35
Plymouth Hemi Cuda 1970|muscle|425|1680|220|5.8|RWD|4.74|1.90|1.30
Dodge Charger R/T 1969|muscle|375|1710|220|6.4|RWD|5.28|1.95|1.35
Ford Mustang Boss 429|muscle|375|1630|190|7.1|RWD|4.76|1.82|1.30
Buick GNX 1987|muscle|276|1590|200|5.5|RWD|5.08|1.81|1.37
Volkswagen Golf GTI|hatch|241|1460|250|6.2|FWD|4.29|1.79|1.46
Volkswagen Golf R|hatch|315|1550|250|4.7|AWD|4.29|1.79|1.46
Volkswagen Golf 1.5 TSI|hatch|148|1300|224|8.5|FWD|4.28|1.79|1.46
Volkswagen Polo|hatch|95|1150|187|10.8|FWD|4.07|1.75|1.45
Volkswagen ID.3|hatch|201|1800|160|7.3|RWD|4.26|1.81|1.55
Volkswagen Beetle 1967|hatch|53|840|130|18.0|RWD|4.08|1.54|1.50
Honda Civic Type R|hatch|315|1430|275|5.4|FWD|4.59|1.89|1.41
Honda Fit|hatch|121|1150|175|9.4|FWD|4.04|1.69|1.53
Toyota GR Yaris|hatch|257|1280|230|5.5|AWD|3.99|1.81|1.46
Toyota Yaris|hatch|116|1120|175|9.7|FWD|3.94|1.75|1.50
Toyota Corolla Hatchback|hatch|169|1390|200|8.4|FWD|4.37|1.79|1.44
Ford Focus RS|hatch|345|1530|266|4.7|AWD|4.39|1.82|1.47
Ford Focus|hatch|155|1350|210|8.6|FWD|4.38|1.82|1.45
Ford Fiesta ST|hatch|197|1180|232|6.5|FWD|4.07|1.73|1.47
Hyundai i30 N|hatch|276|1480|250|5.9|FWD|4.34|1.80|1.45
Hyundai Veloster N|hatch|275|1400|250|5.6|FWD|4.26|1.80|1.39
Hyundai i20|hatch|100|1150|188|10.2|FWD|4.04|1.78|1.45
Kia Rio|hatch|100|1160|183|10.7|FWD|4.07|1.73|1.45
Kia Ceed|hatch|158|1350|210|8.6|FWD|4.31|1.80|1.45
Mini Cooper S|hatch|189|1255|235|6.6|FWD|3.88|1.73|1.43
Mini John Cooper Works|hatch|228|1285|246|6.1|FWD|3.88|1.73|1.43
Mini Cooper 1965|hatch|55|650|145|12.0|FWD|3.05|1.41|1.35
Renault Clio RS|hatch|197|1200|230|6.7|FWD|4.09|1.73|1.43
Renault Clio|hatch|100|1150|187|11.0|FWD|4.05|1.80|1.44
Peugeot 208 GTi|hatch|205|1160|230|6.5|FWD|3.97|1.74|1.46
Peugeot 208|hatch|100|1150|188|9.9|FWD|4.06|1.75|1.43
Audi RS3 Sportback|hatch|394|1575|290|3.8|AWD|4.39|1.85|1.44
Mercedes-AMG A45 S|hatch|416|1625|270|3.9|AWD|4.45|1.85|1.41
Mazda3 Hatchback|hatch|186|1430|210|7.9|FWD|4.46|1.80|1.44
Fiat 500|hatch|69|940|160|12.9|FWD|3.57|1.63|1.49
Chevrolet Spark|hatch|98|1020|150|11.0|FWD|3.64|1.60|1.52
Nissan Micra|hatch|92|1080|175|11.0|FWD|3.99|1.74|1.46
Suzuki Swift|hatch|89|920|180|10.6|FWD|3.84|1.74|1.50
Nissan Leaf|hatch|147|1580|144|7.9|FWD|4.49|1.79|1.54
Chevrolet Bolt EV|hatch|200|1616|150|6.5|FWD|4.15|1.77|1.61
BMW i3|hatch|168|1345|150|7.3|RWD|4.01|1.78|1.60
Toyota Camry|sedan|203|1560|210|8.0|FWD|4.88|1.84|1.44
Toyota Corolla|sedan|169|1370|200|8.5|FWD|4.63|1.78|1.44
Toyota Prius|sedan|194|1420|180|7.2|FWD|4.60|1.78|1.43
Toyota Crown|sedan|236|1800|180|7.6|AWD|4.98|1.84|1.54
Honda Accord|sedan|192|1500|210|7.6|FWD|4.97|1.86|1.45
Honda Civic Sedan|sedan|158|1310|200|8.2|FWD|4.67|1.80|1.42
Honda Insight|sedan|151|1350|180|8.5|FWD|4.66|1.82|1.41
Nissan Altima|sedan|188|1480|210|8.0|FWD|4.90|1.85|1.44
Nissan Sentra|sedan|149|1360|190|9.3|FWD|4.64|1.82|1.45
Nissan Versa|sedan|122|1210|185|9.8|FWD|4.50|1.74|1.47
Hyundai Elantra|sedan|147|1300|190|8.9|FWD|4.68|1.83|1.42
Hyundai Sonata|sedan|191|1500|210|7.8|FWD|4.90|1.86|1.45
Hyundai Ioniq 6|sedan|320|2000|185|5.1|AWD|4.86|1.88|1.50
Kia K5|sedan|180|1480|210|7.9|FWD|4.91|1.86|1.45
Kia Forte|sedan|147|1320|190|9.0|FWD|4.64|1.80|1.44
Mazda6|sedan|187|1480|220|8.0|FWD|4.87|1.84|1.45
Subaru Legacy|sedan|182|1600|210|8.5|AWD|4.84|1.84|1.50
Subaru WRX STI|sedan|305|1530|255|5.0|AWD|4.60|1.80|1.48
Mitsubishi Lancer Evolution X|sedan|291|1560|242|4.9|AWD|4.50|1.81|1.48
Mitsubishi Mirage G4|sedan|78|950|170|12.0|FWD|4.30|1.67|1.51
Volkswagen Jetta|sedan|158|1350|210|8.0|FWD|4.70|1.80|1.46
Volkswagen Passat|sedan|174|1500|220|8.4|FWD|4.87|1.83|1.46
Skoda Octavia|sedan|148|1350|230|8.2|FWD|4.69|1.83|1.47
Peugeot 508|sedan|222|1500|250|7.3|FWD|4.75|1.86|1.40
Chevrolet Malibu|sedan|160|1450|210|8.2|FWD|4.93|1.85|1.46
Chevrolet Impala|sedan|305|1680|220|6.8|FWD|5.11|1.85|1.50
Chevrolet Bel Air 1957|sedan|283|1600|180|9.0|RWD|5.08|1.87|1.50
Cadillac Eldorado 1959|sedan|345|2200|190|10.0|RWD|5.71|2.04|1.40
Ford Fusion|sedan|175|1550|210|8.3|FWD|4.87|1.85|1.48
Ford Crown Victoria|sedan|224|1800|190|8.5|RWD|5.39|1.99|1.47
Lincoln Town Car|sedan|239|1900|180|9.0|RWD|5.47|1.99|1.49
Chrysler 300|sedan|292|1830|210|6.5|RWD|5.05|1.90|1.49
Dodge Charger SXT|sedan|292|1810|215|6.6|RWD|5.10|1.91|1.48
Dodge Charger SRT Hellcat|sedan|707|2075|315|3.6|RWD|5.10|1.91|1.46
Dodge Charger Pursuit|sedan|370|1950|240|5.8|AWD|5.10|1.91|1.48
Cadillac CT5|sedan|237|1650|240|6.9|RWD|4.92|1.88|1.45
Cadillac CT5-V Blackwing|sedan|668|1890|322|3.7|RWD|4.92|1.89|1.44
BMW 330i|sedan|255|1570|250|5.6|RWD|4.71|1.83|1.44
BMW 540i|sedan|375|1780|250|4.7|RWD|5.06|1.90|1.52
BMW 760i|sedan|536|2300|250|4.2|AWD|5.39|1.95|1.54
BMW M3 Competition|sedan|503|1730|290|3.9|RWD|4.80|1.90|1.43
BMW M5 Competition|sedan|617|1940|305|3.3|AWD|4.98|1.90|1.47
BMW i4 M50|sedan|536|2290|225|3.9|AWD|4.78|1.85|1.45
Mercedes-Benz C300|sedan|255|1650|250|5.9|RWD|4.75|1.82|1.44
Mercedes-Benz E350|sedan|255|1800|250|6.2|RWD|4.95|1.88|1.47
Mercedes-Benz S580|sedan|496|2200|250|4.4|AWD|5.29|1.95|1.50
Mercedes-AMG C63 S|sedan|503|1725|290|3.9|RWD|4.75|1.84|1.43
Mercedes-AMG E63 S|sedan|603|2000|300|3.3|AWD|4.99|1.91|1.46
Mercedes-Maybach S680|sedan|621|2400|250|4.5|AWD|5.47|1.95|1.51
Audi A4|sedan|201|1600|241|6.3|AWD|4.76|1.85|1.43
Audi A6|sedan|261|1800|250|5.3|AWD|4.94|1.89|1.46
Audi A8 L|sedan|335|2050|250|5.6|AWD|5.30|1.95|1.49
Audi RS7|sedan|591|2065|305|3.5|AWD|5.01|1.95|1.42
Audi e-tron GT|sedan|522|2280|245|4.1|AWD|4.99|1.96|1.41
Lexus ES 350|sedan|302|1650|210|6.6|FWD|4.98|1.86|1.45
Lexus IS 350|sedan|311|1680|230|5.6|RWD|4.71|1.84|1.43
Lexus LS 500|sedan|416|2200|250|4.6|RWD|5.24|1.90|1.45
Genesis G70 3.3T|sedan|365|1750|270|4.7|RWD|4.69|1.85|1.40
Genesis G80|sedan|375|1950|250|5.1|AWD|5.00|1.93|1.47
Genesis G90|sedan|409|2200|250|5.3|AWD|5.28|1.93|1.49
Infiniti Q50 Red Sport|sedan|400|1800|250|4.9|RWD|4.80|1.82|1.44
Acura TLX Type S|sedan|355|1890|250|5.2|AWD|4.94|1.91|1.43
Alfa Romeo Giulia|sedan|280|1550|240|5.2|RWD|4.64|1.86|1.44
Alfa Romeo Giulia Quadrifoglio|sedan|505|1580|307|3.8|RWD|4.64|1.87|1.43
Maserati Ghibli|sedan|345|1870|267|5.5|RWD|4.97|1.95|1.46
Maserati Quattroporte|sedan|424|1950|288|4.8|RWD|5.26|1.95|1.48
Jaguar XF|sedan|247|1700|240|6.5|RWD|4.96|1.88|1.46
Volvo S60 T8|sedan|455|2050|180|4.3|AWD|4.76|1.85|1.43
Volvo S90|sedan|250|1850|180|6.4|AWD|4.96|1.88|1.45
Tesla Model 3 Long Range|sedan|425|1830|233|4.2|AWD|4.72|1.85|1.44
Tesla Model 3 Performance|sedan|510|1850|261|3.1|AWD|4.72|1.85|1.44
Tesla Model S Plaid|sedan|1020|2160|322|2.1|AWD|4.97|1.96|1.44
Lucid Air Grand Touring|sedan|819|2360|270|3.0|AWD|4.98|1.94|1.41
Polestar 2|sedan|408|2100|205|4.5|AWD|4.61|1.86|1.48
Porsche Taycan Turbo S|sedan|750|2295|260|2.8|AWD|4.96|1.97|1.38
Porsche Panamera Turbo S|sedan|620|2155|315|3.1|AWD|5.05|1.94|1.42
Rolls-Royce Phantom|sedan|563|2560|250|5.4|RWD|5.76|2.02|1.65
Rolls-Royce Ghost|sedan|563|2490|250|4.8|AWD|5.55|2.00|1.57
Bentley Flying Spur|sedan|626|2440|333|3.8|AWD|5.32|1.99|1.48
Audi RS6 Avant|wagon|591|2075|305|3.6|AWD|5.00|1.95|1.46
Mercedes-AMG E63 S Wagon|wagon|603|2100|290|3.5|AWD|4.99|1.91|1.48
BMW M3 Touring|wagon|503|1865|280|3.6|AWD|4.80|1.90|1.44
Volvo V90|wagon|250|1900|180|6.6|AWD|4.94|1.88|1.48
Subaru Outback|wagon|182|1700|200|8.7|AWD|4.87|1.86|1.68
Skoda Octavia Combi|wagon|148|1400|220|8.5|FWD|4.69|1.83|1.47
Porsche Taycan Cross Turismo|wagon|469|2300|240|4.9|AWD|4.97|1.97|1.41
Toyota RAV4|suv|203|1620|180|8.0|AWD|4.60|1.86|1.69
Toyota Highlander|suv|265|1980|180|7.5|AWD|4.95|1.93|1.73
Toyota 4Runner|suv|270|2100|180|8.0|AWD|4.83|1.93|1.82
Toyota Land Cruiser 300|suv|409|2600|210|6.7|AWD|4.99|1.98|1.95
Toyota Corolla Cross|suv|169|1500|180|9.0|FWD|4.46|1.83|1.62
Honda CR-V|suv|190|1600|190|8.2|AWD|4.70|1.87|1.68
Honda Pilot|suv|285|2000|190|7.0|AWD|5.07|1.99|1.80
Honda HR-V|suv|158|1450|180|9.8|FWD|4.57|1.80|1.62
Ford Explorer|suv|300|2000|190|6.5|RWD|5.05|2.00|1.78
Ford Escape|suv|180|1600|190|8.7|FWD|4.59|1.88|1.68
Ford Bronco 4-Door|suv|300|2150|180|6.6|AWD|4.81|1.93|1.85
Ford Mustang Mach-E GT|suv|480|2270|200|3.8|AWD|4.71|1.88|1.61
Ford Police Interceptor Utility|suv|400|2200|240|5.8|AWD|5.05|2.00|1.78
Chevrolet Equinox|suv|175|1600|190|8.9|FWD|4.65|1.84|1.66
Chevrolet Tahoe|suv|355|2500|180|7.0|RWD|5.35|2.06|1.93
Chevrolet Suburban|suv|355|2600|180|7.5|RWD|5.73|2.06|1.92
Chevrolet Trailblazer|suv|155|1400|180|9.0|FWD|4.41|1.81|1.66
Cadillac Escalade|suv|420|2650|190|6.1|AWD|5.38|2.06|1.94
Cadillac Lyriq|suv|340|2650|190|5.7|AWD|4.99|1.98|1.62
GMC Yukon Denali|suv|420|2600|180|6.3|AWD|5.34|2.06|1.94
Buick Enclave|suv|310|2050|200|7.0|FWD|5.19|2.00|1.78
Jeep Grand Cherokee|suv|293|2100|210|7.4|AWD|4.91|1.97|1.79
Jeep Grand Cherokee Trackhawk|suv|707|2430|290|3.5|AWD|4.85|1.94|1.75
Jeep Wrangler Unlimited|suv|285|2000|160|7.0|AWD|4.88|1.89|1.85
Jeep Cherokee|suv|271|1800|190|7.2|AWD|4.62|1.86|1.68
Dodge Durango SRT Hellcat|suv|710|2580|290|3.5|AWD|5.11|2.17|1.80
Land Rover Defender 110|suv|395|2350|209|5.8|AWD|5.02|2.00|1.97
Range Rover Sport|suv|395|2350|242|5.4|AWD|4.95|2.05|1.82
Range Rover|suv|523|2500|250|4.6|AWD|5.05|2.05|1.87
Mercedes-AMG G 63|suv|577|2560|220|4.5|AWD|4.87|1.98|1.97
Mercedes-Benz GLE 450|suv|375|2200|250|5.6|AWD|4.92|2.02|1.77
Mercedes-Benz GLS 450|suv|375|2450|250|5.9|AWD|5.21|2.03|1.82
BMW X3 M40i|suv|382|1950|250|4.6|AWD|4.72|1.89|1.67
BMW X5 xDrive40i|suv|375|2200|250|5.3|AWD|4.94|2.00|1.75
BMW X5 M Competition|suv|617|2400|290|3.8|AWD|4.94|2.02|1.75
BMW X7|suv|375|2450|250|5.8|AWD|5.15|2.00|1.81
Audi Q5|suv|261|1850|240|5.9|AWD|4.68|1.89|1.66
Audi Q7|suv|335|2200|250|5.6|AWD|5.06|1.97|1.74
Audi RS Q8|suv|591|2300|305|3.8|AWD|5.01|2.00|1.69
Porsche Cayenne Turbo GT|suv|631|2220|300|3.3|AWD|4.94|2.00|1.64
Porsche Macan S|suv|375|1960|259|4.6|AWD|4.73|1.92|1.62
Lamborghini Urus|suv|641|2200|305|3.6|AWD|5.11|2.02|1.64
Bentley Bentayga|suv|542|2420|290|4.5|AWD|5.13|2.00|1.74
Rolls-Royce Cullinan|suv|563|2750|250|5.2|AWD|5.34|2.16|1.84
Aston Martin DBX707|suv|697|2245|310|3.3|AWD|5.04|2.00|1.68
Ferrari Purosangue|suv|715|2033|310|3.3|AWD|4.97|2.03|1.59
Tesla Model Y Long Range|suv|384|2000|217|4.8|AWD|4.75|1.92|1.62
Tesla Model X Plaid|suv|1020|2450|262|2.6|AWD|5.06|2.00|1.68
Rivian R1S|suv|835|3100|201|3.0|AWD|5.10|2.08|1.96
Hyundai Ioniq 5|suv|320|2100|185|5.1|AWD|4.64|1.89|1.61
Hyundai Tucson|suv|187|1600|190|8.9|FWD|4.63|1.87|1.67
Hyundai Santa Fe|suv|277|1900|200|6.8|AWD|4.83|1.90|1.72
Kia EV6 GT|suv|576|2200|260|3.5|AWD|4.70|1.89|1.55
Kia Telluride|suv|291|2000|190|7.2|AWD|5.00|1.99|1.75
Kia Sportage|suv|187|1600|190|8.9|FWD|4.66|1.86|1.66
Nissan Rogue|suv|201|1600|190|8.4|FWD|4.65|1.84|1.70
Nissan Pathfinder|suv|284|2000|190|7.0|FWD|5.00|1.98|1.80
Nissan Patrol|suv|400|2700|210|6.6|AWD|5.17|1.99|1.94
Lexus RX 350|suv|275|1950|200|7.3|AWD|4.89|1.92|1.70
Lexus LX 600|suv|409|2600|210|6.9|AWD|5.10|1.99|1.90
Mazda CX-5|suv|187|1600|200|8.3|AWD|4.55|1.84|1.68
Mazda CX-90|suv|340|2150|220|6.2|AWD|5.12|1.99|1.74
Subaru Forester|suv|182|1600|190|8.7|AWD|4.64|1.83|1.73
Volkswagen Tiguan|suv|184|1700|200|8.5|FWD|4.51|1.84|1.67
Volkswagen Atlas|suv|269|2000|200|7.3|AWD|5.10|1.99|1.78
Volvo XC90 T8|suv|455|2350|180|5.3|AWD|4.95|1.96|1.78
Volvo XC60|suv|247|1900|180|6.4|AWD|4.71|1.90|1.66
Mitsubishi Outlander|suv|181|1700|190|9.0|AWD|4.71|1.86|1.75
Suzuki Jimny|suv|101|1100|145|12.0|AWD|3.65|1.65|1.72
Infiniti QX80|suv|400|2700|200|6.5|AWD|5.34|2.03|1.94
Lincoln Navigator|suv|440|2700|180|6.0|AWD|5.33|2.12|1.94
Ford F-150|pickup|400|2200|180|5.8|AWD|5.89|2.03|1.96
Ford F-150 Raptor|pickup|450|2600|172|5.5|AWD|5.91|2.19|1.99
Ford F-150 Lightning|pickup|580|2950|177|4.0|AWD|5.91|2.03|1.99
Ford F-250 Super Duty|pickup|430|3200|160|8.0|RWD|6.35|2.03|2.03
Ford Ranger|pickup|270|2000|180|7.0|AWD|5.37|1.92|1.85
Ford Maverick|pickup|250|1700|180|7.0|FWD|5.07|1.85|1.75
Ram 1500|pickup|395|2400|180|6.1|AWD|5.82|2.08|1.97
Ram 1500 TRX|pickup|702|2900|190|3.7|AWD|5.92|2.24|2.06
Chevrolet Silverado 1500|pickup|420|2350|180|5.9|AWD|5.89|2.06|1.92
Chevrolet Silverado 2500 HD|pickup|470|3200|160|8.0|RWD|6.35|2.06|2.04
Chevrolet Colorado|pickup|310|2050|180|6.8|AWD|5.41|1.90|1.79
GMC Sierra 1500 Denali|pickup|420|2400|180|6.0|AWD|5.89|2.06|1.92
GMC Hummer EV|pickup|1000|4100|170|3.5|AWD|5.51|2.20|2.03
Toyota Tacoma|pickup|278|2000|180|7.5|AWD|5.39|1.91|1.79
Toyota Tundra|pickup|389|2500|180|5.9|AWD|5.93|2.04|1.98
Toyota Hilux|pickup|201|2100|175|10.0|AWD|5.33|1.86|1.82
Nissan Frontier|pickup|310|2050|180|7.0|AWD|5.32|1.85|1.83
Nissan Titan|pickup|400|2600|180|6.5|AWD|5.80|2.03|1.97
Honda Ridgeline|pickup|280|2050|180|6.8|AWD|5.33|2.00|1.80
Rivian R1T|pickup|835|3150|201|3.0|AWD|5.51|2.08|1.98
Tesla Cybertruck|pickup|600|3000|180|4.1|AWD|5.68|2.03|1.79
Jeep Gladiator|pickup|285|2200|160|7.5|AWD|5.59|1.89|1.86
Maruti Suzuki Alto K10|hatch|66|750|140|14.5|FWD|3.53|1.49|1.52
Maruti Suzuki Swift|hatch|89|900|165|11.5|FWD|3.86|1.73|1.52
Maruti Suzuki WagonR|hatch|66|830|150|15.0|FWD|3.66|1.62|1.68
Maruti Suzuki Baleno|hatch|89|935|175|11.0|FWD|3.99|1.75|1.50
Tata Tiago|hatch|85|990|150|14.5|FWD|3.77|1.68|1.54
Renault Kwid|hatch|67|750|145|15.5|FWD|3.73|1.58|1.49
Maruti Suzuki Dzire|sedan|89|930|165|12.0|FWD|4.00|1.74|1.52
Honda City|sedan|119|1100|190|10.5|FWD|4.58|1.75|1.49
Hyundai Verna|sedan|158|1250|200|8.5|FWD|4.54|1.77|1.48
Hyundai Creta|suv|113|1300|180|11.8|FWD|4.33|1.79|1.64
Kia Seltos|suv|113|1300|175|11.5|FWD|4.37|1.80|1.65
Tata Nexon|suv|118|1250|180|11.6|FWD|3.99|1.80|1.62
Tata Punch|suv|86|1030|150|16.5|FWD|3.83|1.74|1.62
Tata Harrier|suv|168|1700|180|10.5|FWD|4.61|1.89|1.72
Mahindra Thar|suv|150|1750|155|10.5|RWD|3.99|1.82|1.85
Mahindra XUV700|suv|197|1900|200|9.5|FWD|4.70|1.89|1.76
Mahindra Scorpio N|suv|172|2000|185|10.0|RWD|4.66|1.92|1.87
Mahindra Bolero|suv|75|1615|125|20.0|RWD|3.99|1.75|1.88
Toyota Fortuner|suv|201|2150|180|10.5|RWD|4.80|1.86|1.84
Toyota Innova Crysta|van|148|1800|180|11.5|RWD|4.74|1.83|1.80
Maruti Suzuki Ertiga|van|102|1150|165|13.0|FWD|4.40|1.74|1.69
Force Traveller Ambulance|van|115|2800|120|25.0|RWD|5.92|2.00|2.55
Ford Transit|van|310|2500|160|9.5|RWD|5.98|2.06|2.55
Mercedes-Benz Sprinter|van|188|2500|160|11.0|RWD|5.93|2.02|2.43
Ram ProMaster|van|276|2300|150|10.0|FWD|5.99|2.08|2.29
Chevrolet Express|van|276|2600|150|10.0|RWD|5.69|2.01|2.08
Honda Odyssey|van|280|2000|180|7.0|FWD|5.21|1.99|1.77
Toyota Sienna|van|245|2100|180|7.5|AWD|5.17|2.00|1.78
Chrysler Pacifica|van|287|2000|180|7.2|FWD|5.18|2.02|1.78
Kia Carnival|van|287|2000|190|7.2|FWD|5.16|1.99|1.78
Volkswagen ID. Buzz|van|282|2500|160|6.5|AWD|4.71|1.99|1.94
Volkswagen Transporter|van|148|2000|180|11.5|FWD|4.90|1.90|1.99
Ford Transit Connect|van|162|1600|175|10.0|FWD|4.42|1.83|1.84
Mercedes-Benz V-Class|van|237|2300|220|8.0|RWD|5.14|1.93|1.88
Toyota HiAce|van|174|2200|160|12.0|RWD|5.27|1.95|1.99
Nissan NV200|van|131|1500|160|12.0|FWD|4.40|1.69|1.86
`;

const BODY_INFO = {
  //        traffic share, tyre grip (mu), CG height factor, weight front fraction, downforce, procedural profile
  super:  { share: .5,  mu: 1.18, hcg: .33, front: .42, down: .55, profile: 'sport', model: true },
  sports: { share: 1.2, mu: 1.08, hcg: .36, front: .45, down: .25, profile: 'sport', model: true },
  coupe:  { share: 1.6, mu: 1.0,  hcg: .38, front: .52, down: .08, profile: 'sport' },
  muscle: { share: 1.8, mu: .95,  hcg: .4,  front: .55, down: .05, profile: 'muscle' },
  sedan:  { share: 11,  mu: .92,  hcg: .4,  front: .58, down: 0,   profile: 'sedan' },
  hatch:  { share: 7,   mu: .92,  hcg: .41, front: .6,  down: 0,   profile: 'hatch' },
  wagon:  { share: 1.5, mu: .92,  hcg: .41, front: .56, down: 0,   profile: 'wagon' },
  suv:    { share: 10,  mu: .86,  hcg: .46, front: .54, down: 0,   profile: 'suv' },
  pickup: { share: 5,   mu: .82,  hcg: .47, front: .57, down: 0,   profile: 'pickup' },
  van:    { share: 2.5, mu: .8,   hcg: .5,  front: .55, down: 0,   profile: 'van' },
  bike:   { share: 4,   mu: 1.05, hcg: .5,  front: .48, down: 0,   profile: 'sport', model: true },
};

const CAR_DB = CAR_DB_RAW.trim().split('\n').map(line => {
  const [name, body, hp, kg, top, t100, drive, L, W, H] = line.split('|');
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const B = BODY_INFO[body];
  return {
    id, name, body, hp: +hp, kg: +kg, top: +top, t100: +t100, drive, L: +L, W: +W, H: +H,
    profile: B.profile, useModel: !!B.model, maxSpeed: +top / 3.6, r: clamp(+H * .26, .31, .46),
  };
});

// ------------------------------------------------------------------
// Physics parameters from real specs:
//   drag area from top speed (power = drag + rolling at Vmax),
//   launch traction calibrated so a simulated 0-100 km/h matches spec.
// ------------------------------------------------------------------
function carPhysics(t) {
  if (t.ph) return t.ph;
  const g = 9.81, rho = 1.225, Crr = .013, B = BODY_INFO[t.body];
  const m = t.kg + 80, P = t.hp * 745.7 * .87, vmax = t.top / 3.6;
  const CdA = clamp((P - Crr * m * g * vmax) / (.5 * rho * vmax ** 3), .3, 2.2);
  const wb = t.L * .6, b = wb * B.front, a = wb - b;           // a: CG -> front axle, b: CG -> rear (front-heavy = small a)
  const driveFrac = t.drive === 'AWD' ? 1 : t.drive === 'RWD' ? (a / wb) + .08 : (b / wb) - .06;
  const ph = { m, P, vmax, CdA, Crr, wb, a, b, mu: B.mu, down: B.down, drive: t.drive, hcg: t.H * B.hcg };
  ph.xfer = m * ph.hcg / wb;
  ph.Cf = m * g * (b / wb) * 17;  ph.Cr = m * g * (a / wb) * 19.5;  // cornering stiffness (N/rad), rear stiffer = stable
  ph.Iz = m * (t.L * t.L + t.W * t.W) / 12;
  ph.lock = t.body === 'van' || t.body === 'pickup' ? .55 : t.body === 'bike' ? .5 : .62;
  ph.vrev = 9;
  // calibrate launch traction so 0-100 matches the published figure
  const sim = muL => {
    let v = 0, tt = 0; const dt = .01, N = m * g * driveFrac;
    while (v < 27.78 && tt < 40) {
      const F = Math.min(P / Math.max(v, 1), muL * N) - .5 * rho * CdA * v * v - Crr * m * g;
      v += F / m * dt; tt += dt;
    }
    return tt;
  };
  let lo = .35, hi = 2.2;
  if (sim(hi) > t.t100) ph.muL = hi; else if (sim(lo) < t.t100) ph.muL = lo;
  else { for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (sim(mid) > t.t100) lo = mid; else hi = mid; } ph.muL = (lo + hi) / 2; }
  t.ph = ph;
  return ph;
}

// Weighted pick: body share, uniform within a body type
const _byBody = {};
for (const c of CAR_DB) (_byBody[c.body] = _byBody[c.body] || []).push(c);
// only cars that have a genuine 3D model drive around (see carmodels.js)
function pickTrafficType() {
  const real = Object.keys(CAR_TYPES).filter(k => CAR_TYPES[k].model && CAR_DB.some(c => c.id === k));
  const bikes = real.filter(k => CAR_TYPES[k].body === 'bike'), cars = real.filter(k => CAR_TYPES[k].body !== 'bike');
  if (bikes.length && (Math.random() < .35 || !cars.length)) return pick(bikes);   // Kerala roads: lots of two-wheelers
  if (cars.length) return pick(cars);
  return pickTrafficTypeAny();
}
function pickTrafficTypeAny() {
  const bodies = Object.keys(_byBody), tot = bodies.reduce((s, b) => s + BODY_INFO[b].share, 0);
  let r = Math.random() * tot;
  for (const b of bodies) { r -= BODY_INFO[b].share; if (r <= 0) return pick(_byBody[b]).id; }
  return 'toyota_camry';
}
function buildCarTypes() {
  const T = {};
  for (const c of CAR_DB) T[c.id] = c;
  // story / service vehicles mapped to real cars
  const alias = (key, id, extra) => { T[key] = Object.assign({}, T[id], extra || {}); };
  alias('vortex', 'ferrari_458_italia');
  alias('viper', 'porsche_911_carrera_4s');
  alias('sedan', 'porsche_911_carrera_4s');
  alias('muscle', 'porsche_911_carrera_4s');
  alias('suv', 'ferrari_458_italia');
  alias('taxi', 'porsche_911_carrera_4s');
  alias('van', 'ferrari_458_italia');
  alias('police', 'porsche_911_carrera_4s', { name: 'Porsche 911 Carrera 4S (Kerala Police)' });
  alias('ambulance', 'force_traveller_ambulance', { name: 'Kanivu 108 Ambulance (Force Traveller)' });
  return T;
}
