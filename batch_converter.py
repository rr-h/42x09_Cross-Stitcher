#!/usr/bin/env python3
import argparse
import math
import os
import sys
from collections import defaultdict
from xml.etree.ElementTree import Element, SubElement, tostring

from PIL import Image

# From src/data/dmcColors.ts
DMC_COLORS = [
    {"code": "B5200", "name": "Snow White", "hex": "#FFFFFF"},
    {"code": "White", "name": "White", "hex": "#FCFCFC"},
    {"code": "Ecru", "name": "Ecru", "hex": "#F0EADA"},
    {"code": "150", "name": "Dusty Rose - Ultra Very Dark", "hex": "#AB0249"},
    {"code": "151", "name": "Dusty Rose - Very Light", "hex": "#F0CED4"},
    {"code": "152", "name": "Shell Pink - Medium Light", "hex": "#E2A099"},
    {"code": "153", "name": "Violet - Very Light", "hex": "#E6CDD9"},
    {"code": "154", "name": "Grape - Very Dark", "hex": "#572433"},
    {"code": "155", "name": "Blue Violet - Medium Dark", "hex": "#9891B6"},
    {"code": "156", "name": "Blue Violet - Medium Light", "hex": "#A3A7C5"},
    {"code": "157", "name": "Cornflower Blue - Very Light", "hex": "#BBC3D9"},
    {"code": "158", "name": "Cornflower Blue - Medium Very Dark", "hex": "#4C526E"},
    {"code": "159", "name": "Blue Gray - Light", "hex": "#C7C9D6"},
    {"code": "160", "name": "Blue Gray - Medium", "hex": "#999FB3"},
    {"code": "161", "name": "Blue Gray", "hex": "#7880A0"},
    {"code": "162", "name": "Blue - Ultra Very Light", "hex": "#DBE9F4"},
    {"code": "163", "name": "Celadon Green - Medium", "hex": "#4D9D7A"},
    {"code": "164", "name": "Forest Green - Light", "hex": "#C8DEC2"},
    {"code": "165", "name": "Moss Green - Very Light", "hex": "#EFF5A7"},
    {"code": "166", "name": "Moss Green - Medium Light", "hex": "#C0C840"},
    {"code": "167", "name": "Yellow Beige - Very Dark", "hex": "#A77B4B"},
    {"code": "168", "name": "Pewter - Very Light", "hex": "#D1D1D1"},
    {"code": "169", "name": "Pewter - Light", "hex": "#848484"},
    {"code": "208", "name": "Lavender - Very Dark", "hex": "#835898"},
    {"code": "209", "name": "Lavender - Dark", "hex": "#A374AC"},
    {"code": "210", "name": "Lavender - Medium", "hex": "#C59FC9"},
    {"code": "211", "name": "Lavender - Light", "hex": "#E3C7E4"},
    {"code": "221", "name": "Shell Pink - Very Dark", "hex": "#883C3E"},
    {"code": "223", "name": "Shell Pink - Light", "hex": "#CC8E8E"},
    {"code": "224", "name": "Shell Pink - Very Light", "hex": "#EBBBBB"},
    {"code": "225", "name": "Shell Pink - Ultra Very Light", "hex": "#FFDFD9"},
    {"code": "300", "name": "Mahogany - Very Dark", "hex": "#6F2F00"},
    {"code": "301", "name": "Mahogany - Medium", "hex": "#B35F2B"},
    {"code": "304", "name": "Christmas Red - Medium", "hex": "#B70028"},
    {"code": "307", "name": "Lemon", "hex": "#FDED54"},
    {"code": "309", "name": "Rose - Dark", "hex": "#BA304C"},
    {"code": "310", "name": "Black", "hex": "#000000"},
    {"code": "311", "name": "Navy Blue - Medium", "hex": "#1C5066"},
    {"code": "312", "name": "Navy Blue - Light", "hex": "#365E7D"},
    {"code": "315", "name": "Antique Mauve - Medium Dark", "hex": "#814854"},
    {"code": "316", "name": "Antique Mauve - Medium", "hex": "#B87382"},
    {"code": "317", "name": "Pewter Gray", "hex": "#6C6C6C"},
    {"code": "318", "name": "Steel Gray - Light", "hex": "#ABABAB"},
    {"code": "319", "name": "Pistachio Green - Very Dark", "hex": "#205E3B"},
    {"code": "320", "name": "Pistachio Green - Medium", "hex": "#69A569"},
    {"code": "321", "name": "Christmas Red", "hex": "#C72A35"},
    {"code": "322", "name": "Navy Blue - Very Light", "hex": "#5A879E"},
    {"code": "326", "name": "Rose - Very Dark", "hex": "#B33850"},
    {"code": "327", "name": "Violet - Dark", "hex": "#633672"},
    {"code": "333", "name": "Blue Violet - Very Dark", "hex": "#5C5478"},
    {"code": "334", "name": "Baby Blue - Medium", "hex": "#739FC3"},
    {"code": "335", "name": "Rose", "hex": "#EE546E"},
    {"code": "336", "name": "Navy Blue", "hex": "#253B73"},
    {"code": "340", "name": "Blue Violet - Medium", "hex": "#ADA7C7"},
    {"code": "341", "name": "Blue Violet - Light", "hex": "#B7B5D0"},
    {"code": "347", "name": "Salmon - Very Dark", "hex": "#BF2D2D"},
    {"code": "349", "name": "Coral - Dark", "hex": "#D21035"},
    {"code": "350", "name": "Coral - Medium", "hex": "#E04848"},
    {"code": "351", "name": "Coral", "hex": "#E96A67"},
    {"code": "352", "name": "Coral - Light", "hex": "#FD9C97"},
    {"code": "353", "name": "Peach", "hex": "#FED7CC"},
    {"code": "355", "name": "Terra Cotta - Dark", "hex": "#984236"},
    {"code": "356", "name": "Terra Cotta - Medium", "hex": "#C56A5A"},
    {"code": "367", "name": "Pistachio Green - Dark", "hex": "#617E5A"},
    {"code": "368", "name": "Pistachio Green - Light", "hex": "#A6D0A1"},
    {"code": "369", "name": "Pistachio Green - Very Light", "hex": "#D6E8D6"},
    {"code": "370", "name": "Mustard - Medium", "hex": "#B89058"},
    {"code": "371", "name": "Mustard", "hex": "#BF9A64"},
    {"code": "372", "name": "Mustard - Light", "hex": "#CCA86D"},
    {"code": "400", "name": "Mahogany - Dark", "hex": "#8F4620"},
    {"code": "402", "name": "Mahogany - Very Light", "hex": "#F7A777"},
    {"code": "407", "name": "Desert Sand - Dark", "hex": "#B37E69"},
    {"code": "413", "name": "Pewter Gray - Dark", "hex": "#5B5B5B"},
    {"code": "414", "name": "Steel Gray - Dark", "hex": "#8C8C8C"},
    {"code": "415", "name": "Pearl Gray", "hex": "#C9C9C9"},
    {"code": "420", "name": "Hazelnut Brown - Dark", "hex": "#A06A30"},
    {"code": "422", "name": "Hazelnut Brown - Light", "hex": "#C6976A"},
    {"code": "433", "name": "Brown - Medium", "hex": "#7A4A1F"},
    {"code": "434", "name": "Brown - Light", "hex": "#98592F"},
    {"code": "435", "name": "Brown - Very Light", "hex": "#B9743E"},
    {"code": "436", "name": "Tan", "hex": "#CB8B4E"},
    {"code": "437", "name": "Tan - Light", "hex": "#E4BC80"},
    {"code": "444", "name": "Lemon - Dark", "hex": "#FFD600"},
    {"code": "445", "name": "Lemon - Light", "hex": "#FFFB91"},
    {"code": "451", "name": "Shell Gray - Dark", "hex": "#908482"},
    {"code": "452", "name": "Shell Gray - Medium", "hex": "#B8ABAB"},
    {"code": "453", "name": "Shell Gray - Light", "hex": "#CEC6C6"},
    {"code": "469", "name": "Avocado Green", "hex": "#728A3B"},
    {"code": "470", "name": "Avocado Green - Light", "hex": "#94AB4E"},
    {"code": "471", "name": "Avocado Green - Very Light", "hex": "#AEC151"},
    {"code": "472", "name": "Avocado Green - Ultra Light", "hex": "#D8EEA7"},
    {"code": "498", "name": "Christmas Red - Dark", "hex": "#A7132C"},
    {"code": "500", "name": "Blue Green - Very Dark", "hex": "#043F2F"},
    {"code": "501", "name": "Blue Green - Dark", "hex": "#3B6F5D"},
    {"code": "502", "name": "Blue Green", "hex": "#5B9680"},
    {"code": "503", "name": "Blue Green - Medium", "hex": "#7EB5A1"},
    {"code": "504", "name": "Blue Green - Very Light", "hex": "#CADEC9"},
    {"code": "505", "name": "Jade Green", "hex": "#338262"},
    {"code": "517", "name": "Wedgwood - Dark", "hex": "#3B7895"},
    {"code": "518", "name": "Wedgwood - Light", "hex": "#4F93A7"},
    {"code": "519", "name": "Sky Blue", "hex": "#7EB5D5"},
    {"code": "520", "name": "Fern Green - Dark", "hex": "#666B4C"},
    {"code": "522", "name": "Fern Green", "hex": "#969E7E"},
    {"code": "523", "name": "Fern Green - Light", "hex": "#ABB393"},
    {"code": "524", "name": "Fern Green - Very Light", "hex": "#C4CBA6"},
    {"code": "535", "name": "Ash Gray - Very Light", "hex": "#636363"},
    {"code": "543", "name": "Beige Brown - Ultra Very Light", "hex": "#F2DFD1"},
    {"code": "550", "name": "Violet - Very Dark", "hex": "#5C2058"},
    {"code": "552", "name": "Violet - Medium", "hex": "#803A7A"},
    {"code": "553", "name": "Violet", "hex": "#A3639E"},
    {"code": "554", "name": "Violet - Light", "hex": "#DB9FDA"},
    {"code": "561", "name": "Jade - Very Dark", "hex": "#2D6E5C"},
    {"code": "562", "name": "Jade - Medium", "hex": "#53A17E"},
    {"code": "563", "name": "Jade - Light", "hex": "#8FCBAA"},
    {"code": "564", "name": "Jade - Very Light", "hex": "#A8DBC3"},
    {"code": "580", "name": "Moss Green - Dark", "hex": "#888C2F"},
    {"code": "581", "name": "Moss Green", "hex": "#A7AB3C"},
    {"code": "597", "name": "Turquoise", "hex": "#5BB4C0"},
    {"code": "598", "name": "Turquoise - Light", "hex": "#90D3D8"},
    {"code": "600", "name": "Cranberry - Very Dark", "hex": "#CD2E5F"},
    {"code": "601", "name": "Cranberry - Dark", "hex": "#D13570"},
    {"code": "602", "name": "Cranberry - Medium", "hex": "#E24777"},
    {"code": "603", "name": "Cranberry", "hex": "#FF7398"},
    {"code": "604", "name": "Cranberry - Light", "hex": "#FF9DB6"},
    {"code": "605", "name": "Cranberry - Very Light", "hex": "#FFC1CE"},
    {"code": "606", "name": "Bright Orange-Red", "hex": "#FA3909"},
    {"code": "608", "name": "Bright Orange", "hex": "#FD6631"},
    {"code": "610", "name": "Drab Brown - Dark", "hex": "#796140"},
    {"code": "611", "name": "Drab Brown", "hex": "#967654"},
    {"code": "612", "name": "Drab Brown - Light", "hex": "#BC9E6E"},
    {"code": "613", "name": "Drab Brown - Very Light", "hex": "#DCC9A7"},
    {"code": "632", "name": "Desert Sand - Ultra Very Dark", "hex": "#874530"},
    {"code": "640", "name": "Beige Gray - Very Dark", "hex": "#856F5E"},
    {"code": "642", "name": "Beige Gray - Dark", "hex": "#A69586"},
    {"code": "644", "name": "Beige Gray - Medium", "hex": "#DDD6C7"},
    {"code": "645", "name": "Beaver Gray - Very Dark", "hex": "#6A6561"},
    {"code": "646", "name": "Beaver Gray - Dark", "hex": "#8B8985"},
    {"code": "647", "name": "Beaver Gray - Medium", "hex": "#B0AFAB"},
    {"code": "648", "name": "Beaver Gray - Light", "hex": "#BDBBB7"},
    {"code": "666", "name": "Christmas Red - Bright", "hex": "#E3172D"},
    {"code": "676", "name": "Old Gold - Light", "hex": "#E6C677"},
    {"code": "677", "name": "Old Gold - Very Light", "hex": "#F5E8C6"},
    {"code": "680", "name": "Old Gold - Dark", "hex": "#BC8820"},
    {"code": "699", "name": "Christmas Green", "hex": "#056E1D"},
    {"code": "700", "name": "Christmas Green - Bright", "hex": "#077F22"},
    {"code": "701", "name": "Christmas Green - Light", "hex": "#3F9434"},
    {"code": "702", "name": "Kelly Green", "hex": "#47A546"},
    {"code": "703", "name": "Chartreuse", "hex": "#7BB55E"},
    {"code": "704", "name": "Chartreuse - Bright", "hex": "#9EC23F"},
    {"code": "712", "name": "Cream", "hex": "#FFFDE3"},
    {"code": "718", "name": "Plum", "hex": "#9C2462"},
    {"code": "720", "name": "Orange Spice - Dark", "hex": "#E5521A"},
    {"code": "721", "name": "Orange Spice - Medium", "hex": "#F27842"},
    {"code": "722", "name": "Orange Spice - Light", "hex": "#F7977A"},
    {"code": "725", "name": "Topaz", "hex": "#FFC840"},
    {"code": "726", "name": "Topaz - Light", "hex": "#FDD755"},
    {"code": "727", "name": "Topaz - Very Light", "hex": "#FFF1A5"},
    {"code": "728", "name": "Topaz - Golden", "hex": "#E4A824"},
    {"code": "729", "name": "Old Gold - Medium", "hex": "#D0A23A"},
    {"code": "730", "name": "Olive Green - Very Dark", "hex": "#827B1A"},
    {"code": "731", "name": "Olive Green - Dark", "hex": "#918E1B"},
    {"code": "732", "name": "Olive Green", "hex": "#948E25"},
    {"code": "733", "name": "Olive Green - Medium", "hex": "#BDBA3F"},
    {"code": "734", "name": "Olive Green - Light", "hex": "#C7C36E"},
    {"code": "738", "name": "Tan - Very Light", "hex": "#ECCC9D"},
    {"code": "739", "name": "Tan - Ultra Very Light", "hex": "#F5E3CE"},
    {"code": "740", "name": "Tangerine", "hex": "#FF8313"},
    {"code": "741", "name": "Tangerine - Medium", "hex": "#FF9F26"},
    {"code": "742", "name": "Tangerine - Light", "hex": "#FFBF49"},
    {"code": "743", "name": "Yellow - Medium", "hex": "#FFCD48"},
    {"code": "744", "name": "Yellow - Pale", "hex": "#FFE475"},
    {"code": "745", "name": "Yellow - Light Pale", "hex": "#FFE9A2"},
    {"code": "746", "name": "Off White", "hex": "#FFF8E7"},
    {"code": "747", "name": "Sky Blue - Very Light", "hex": "#E5F4F6"},
    {"code": "754", "name": "Peach - Light", "hex": "#F7CAB3"},
    {"code": "758", "name": "Terra Cotta - Very Light", "hex": "#EEB5A3"},
    {"code": "760", "name": "Salmon", "hex": "#F59593"},
    {"code": "761", "name": "Salmon - Light", "hex": "#FFB9B9"},
    {"code": "762", "name": "Pearl Gray - Very Light", "hex": "#ECECEC"},
    {"code": "772", "name": "Yellow Green - Very Light", "hex": "#E4ECBA"},
    {"code": "775", "name": "Baby Blue - Very Light", "hex": "#D9E9F3"},
    {"code": "776", "name": "Pink - Medium", "hex": "#FCA4B4"},
    {"code": "777", "name": "Raspberry - Very Dark", "hex": "#8F0042"},
    {"code": "778", "name": "Antique Mauve - Very Light", "hex": "#DFB8BD"},
    {"code": "779", "name": "Cocoa - Dark", "hex": "#6B4136"},
    {"code": "780", "name": "Topaz - Ultra Very Dark", "hex": "#946426"},
    {"code": "781", "name": "Topaz - Very Dark", "hex": "#A66E14"},
    {"code": "782", "name": "Topaz - Dark", "hex": "#AE7720"},
    {"code": "783", "name": "Topaz - Medium", "hex": "#CE9127"},
    {"code": "791", "name": "Cornflower Blue - Very Dark", "hex": "#464A79"},
    {"code": "792", "name": "Cornflower Blue - Dark", "hex": "#555F8D"},
    {"code": "793", "name": "Cornflower Blue - Medium", "hex": "#7087A3"},
    {"code": "794", "name": "Cornflower Blue - Light", "hex": "#8FAEC0"},
    {"code": "796", "name": "Royal Blue - Dark", "hex": "#113D73"},
    {"code": "797", "name": "Royal Blue", "hex": "#1346A5"},
    {"code": "798", "name": "Delft Blue - Dark", "hex": "#466AA9"},
    {"code": "799", "name": "Delft Blue - Medium", "hex": "#74A3CD"},
    {"code": "800", "name": "Delft Blue - Pale", "hex": "#C0D6EA"},
    {"code": "801", "name": "Coffee Brown - Dark", "hex": "#5C3716"},
    {"code": "803", "name": "Baby Blue - Ultra Very Dark", "hex": "#2C4978"},
    {"code": "806", "name": "Peacock Blue - Dark", "hex": "#30A3AD"},
    {"code": "807", "name": "Peacock Blue", "hex": "#64B8BD"},
    {"code": "809", "name": "Delft Blue", "hex": "#94B8D5"},
    {"code": "813", "name": "Blue - Light", "hex": "#A1C6E0"},
    {"code": "814", "name": "Garnet - Dark", "hex": "#7B0027"},
    {"code": "815", "name": "Garnet - Medium", "hex": "#880D2E"},
    {"code": "816", "name": "Garnet", "hex": "#970B2F"},
    {"code": "817", "name": "Coral Red - Very Dark", "hex": "#BB0D1D"},
    {"code": "818", "name": "Baby Pink", "hex": "#FFDFE5"},
    {"code": "819", "name": "Baby Pink - Light", "hex": "#FFE5EC"},
    {"code": "820", "name": "Royal Blue - Very Dark", "hex": "#0E2E6E"},
    {"code": "822", "name": "Beige Gray - Light", "hex": "#E8E3D7"},
    {"code": "823", "name": "Navy Blue - Dark", "hex": "#213466"},
    {"code": "824", "name": "Blue - Very Dark", "hex": "#3A5D87"},
    {"code": "825", "name": "Blue - Dark", "hex": "#477AAB"},
    {"code": "826", "name": "Blue - Medium", "hex": "#6B9FC5"},
    {"code": "827", "name": "Blue - Very Light", "hex": "#B9D4E9"},
    {"code": "828", "name": "Blue - Ultra Very Light", "hex": "#C5E1EF"},
    {"code": "829", "name": "Golden Olive - Very Dark", "hex": "#7E6A21"},
    {"code": "830", "name": "Golden Olive - Dark", "hex": "#8E7A30"},
    {"code": "831", "name": "Golden Olive - Medium", "hex": "#AA903C"},
    {"code": "832", "name": "Golden Olive", "hex": "#C09C2E"},
    {"code": "833", "name": "Golden Olive - Light", "hex": "#C9AC5B"},
    {"code": "834", "name": "Golden Olive - Very Light", "hex": "#DBBD6B"},
    {"code": "838", "name": "Beige Brown - Very Dark", "hex": "#5C3F2A"},
    {"code": "839", "name": "Beige Brown - Dark", "hex": "#6E4E35"},
    {"code": "840", "name": "Beige Brown - Medium", "hex": "#9A7F66"},
    {"code": "841", "name": "Beige Brown - Light", "hex": "#B8A188"},
    {"code": "842", "name": "Beige Brown - Very Light", "hex": "#D7C9B4"},
    {"code": "844", "name": "Beaver Gray - Ultra Dark", "hex": "#545454"},
    {"code": "869", "name": "Hazelnut Brown - Very Dark", "hex": "#835F2E"},
    {"code": "890", "name": "Pistachio Green - Ultra Dark", "hex": "#174924"},
    {"code": "891", "name": "Carnation - Dark", "hex": "#FF5773"},
    {"code": "892", "name": "Carnation - Medium", "hex": "#FF6B85"},
    {"code": "893", "name": "Carnation - Light", "hex": "#FC90A7"},
    {"code": "894", "name": "Carnation - Very Light", "hex": "#FFB5C2"},
    {"code": "895", "name": "Hunter Green - Very Dark", "hex": "#1B5118"},
    {"code": "898", "name": "Coffee Brown - Very Dark", "hex": "#4A2710"},
    {"code": "899", "name": "Rose - Medium", "hex": "#F27688"},
    {"code": "900", "name": "Burnt Orange - Dark", "hex": "#D65300"},
    {"code": "902", "name": "Garnet - Very Dark", "hex": "#820024"},
    {"code": "904", "name": "Parrot Green - Very Dark", "hex": "#557122"},
    {"code": "905", "name": "Parrot Green - Dark", "hex": "#6C8B20"},
    {"code": "906", "name": "Parrot Green - Medium", "hex": "#7FAE20"},
    {"code": "907", "name": "Parrot Green - Light", "hex": "#C4D74F"},
    {"code": "909", "name": "Emerald Green - Very Dark", "hex": "#0C6847"},
    {"code": "910", "name": "Emerald Green - Dark", "hex": "#187F54"},
    {"code": "911", "name": "Emerald Green - Medium", "hex": "#189065"},
    {"code": "912", "name": "Emerald Green - Light", "hex": "#1BA176"},
    {"code": "913", "name": "Nile Green - Medium", "hex": "#6DB795"},
    {"code": "915", "name": "Plum - Dark", "hex": "#820043"},
    {"code": "917", "name": "Plum - Medium", "hex": "#9B2A6D"},
    {"code": "918", "name": "Red Copper - Dark", "hex": "#824028"},
    {"code": "919", "name": "Red Copper", "hex": "#A6512E"},
    {"code": "920", "name": "Copper - Medium", "hex": "#AC5533"},
    {"code": "921", "name": "Copper", "hex": "#C66B3D"},
    {"code": "922", "name": "Copper - Light", "hex": "#E27C49"},
    {"code": "924", "name": "Gray Green - Very Dark", "hex": "#566C62"},
    {"code": "926", "name": "Gray Green - Medium", "hex": "#98AFAA"},
    {"code": "927", "name": "Gray Green - Light", "hex": "#BDCECB"},
    {"code": "928", "name": "Gray Green - Very Light", "hex": "#DDE6E3"},
    {"code": "930", "name": "Antique Blue - Dark", "hex": "#45597F"},
    {"code": "931", "name": "Antique Blue - Medium", "hex": "#6A7F9C"},
    {"code": "932", "name": "Antique Blue - Light", "hex": "#A2B7CA"},
    {"code": "934", "name": "Black Avocado Green", "hex": "#3A3E2A"},
    {"code": "935", "name": "Avocado Green - Dark", "hex": "#495332"},
    {"code": "936", "name": "Avocado Green - Very Dark", "hex": "#4C532E"},
    {"code": "937", "name": "Avocado Green - Medium", "hex": "#627341"},
    {"code": "938", "name": "Coffee Brown - Ultra Dark", "hex": "#362312"},
    {"code": "939", "name": "Navy Blue - Very Dark", "hex": "#1B2850"},
    {"code": "943", "name": "Aquamarine - Medium", "hex": "#3DA494"},
    {"code": "945", "name": "Tawny", "hex": "#FBC7A3"},
    {"code": "946", "name": "Burnt Orange - Medium", "hex": "#EB6307"},
    {"code": "947", "name": "Burnt Orange", "hex": "#FF7B31"},
    {"code": "948", "name": "Peach - Very Light", "hex": "#FEE7D6"},
    {"code": "950", "name": "Desert Sand - Light", "hex": "#EED1BE"},
    {"code": "951", "name": "Tawny - Light", "hex": "#FFE4CA"},
    {"code": "954", "name": "Nile Green", "hex": "#88C9A7"},
    {"code": "955", "name": "Nile Green - Light", "hex": "#A5E0C0"},
    {"code": "956", "name": "Geranium", "hex": "#FF6A76"},
    {"code": "957", "name": "Geranium - Pale", "hex": "#FF9FAB"},
    {"code": "958", "name": "Seagreen - Dark", "hex": "#3DB8A3"},
    {"code": "959", "name": "Seagreen - Medium", "hex": "#59C7B3"},
    {"code": "961", "name": "Dusty Rose - Dark", "hex": "#CF6679"},
    {"code": "962", "name": "Dusty Rose - Medium", "hex": "#E77A91"},
    {"code": "963", "name": "Dusty Rose - Ultra Very Light", "hex": "#FFD4DA"},
    {"code": "964", "name": "Seagreen - Light", "hex": "#A9E2DA"},
    {"code": "966", "name": "Baby Green - Medium", "hex": "#B9D9B8"},
    {"code": "967", "name": "Apricot - Very Light", "hex": "#FFCDC1"},
    {"code": "970", "name": "Pumpkin - Light", "hex": "#FF7F26"},
    {"code": "971", "name": "Pumpkin", "hex": "#FF7700"},
    {"code": "972", "name": "Canary - Deep", "hex": "#FFB508"},
    {"code": "973", "name": "Canary - Bright", "hex": "#FFF400"},
    {"code": "975", "name": "Golden Brown - Dark", "hex": "#915224"},
    {"code": "976", "name": "Golden Brown - Medium", "hex": "#C28346"},
    {"code": "977", "name": "Golden Brown - Light", "hex": "#DC9C56"},
    {"code": "986", "name": "Forest Green - Very Dark", "hex": "#406A3A"},
    {"code": "987", "name": "Forest Green - Dark", "hex": "#587F50"},
    {"code": "988", "name": "Forest Green - Medium", "hex": "#73A063"},
    {"code": "989", "name": "Forest Green", "hex": "#8DB77E"},
    {"code": "991", "name": "Aquamarine - Dark", "hex": "#477C73"},
    {"code": "992", "name": "Aquamarine", "hex": "#6FC9B8"},
    {"code": "993", "name": "Aquamarine - Light", "hex": "#90D5C5"},
    {"code": "995", "name": "Electric Blue - Dark", "hex": '#26A3D4'},
    {"code": "996", "name": "Electric Blue - Medium", "hex": "#30C1EE"},
    {"code": "3011", "name": "Khaki Green - Dark", "hex": "#898752"},
    {"code": "3012", "name": "Khaki Green - Medium", "hex": "#A6A46A"},
    {"code": "3013", "name": "Khaki Green - Light", "hex": "#B8B888"},
    {"code": "3021", "name": "Brown Gray - Very Dark", "hex": "#4C443C"},
    {"code": "3022", "name": "Brown Gray - Medium", "hex": "#8C8472"},
    {"code": "3023", "name": "Brown Gray - Light", "hex": "#B5AD9C"},
    {"code": "3024", "name": "Brown Gray - Very Light", "hex": "#E9E6E0"},
    {"code": "3031", "name": "Mocha Brown - Very Dark", "hex": "#4C3E2A"},
    {"code": "3032", "name": "Mocha Brown - Medium", "hex": "#B39B7C"},
    {"code": "3033", "name": "Mocha Brown - Very Light", "hex": "#E2D7C7"},
    {"code": "3041", "name": "Antique Violet - Medium", "hex": "#9C7F8E"},
    {"code": "3042", "name": "Antique Violet - Light", "hex": "#B7A3AF"},
    {"code": "3045", "name": "Yellow Beige - Dark", "hex": "#BC9658"},
    {"code": "3046", "name": "Yellow Beige - Medium", "hex": "#D6BB82"},
    {"code": "3047", "name": "Yellow Beige - Light", "hex": "#E7D7AC"},
    {"code": "3051", "name": "Green Gray - Dark", "hex": "#5F6949"},
    {"code": "3052", "name": "Green Gray - Medium", "hex": "#899171"},
    {"code": "3053", "name": "Green Gray", "hex": "#9CA586"},
    {"code": "3064", "name": "Desert Sand", "hex": "#C58C72"},
    {"code": "3072", "name": "Beaver Gray - Very Light", "hex": "#E8E7E5"},
    {"code": "3078", "name": "Golden Yellow - Very Light", "hex": "#FDF9CC"},
    {"code": "3325", "name": "Baby Blue - Light", "hex": "#B9D3E8"},
    {"code": "3326", "name": "Rose - Light", "hex": "#FBB4BC"},
    {"code": "3328", "name": "Salmon - Dark", "hex": "#E36D6B"},
    {"code": "3340", "name": "Apricot - Medium", "hex": "#FF8B68"},
    {"code": "3341", "name": "Apricot", "hex": "#FCAB8C"},
    {"code": "3345", "name": "Hunter Green - Dark", "hex": "#1B6022"},
    {"code": "3346", "name": "Hunter Green", "hex": "#406A33"},
    {"code": "3347", "name": "Yellow Green - Medium", "hex": "#719E4E"},
    {"code": "3348", "name": "Yellow Green - Light", "hex": "#CCEA9E"},
    {"code": "3350", "name": "Dusty Rose - Ultra Dark", "hex": "#BC4365"},
    {"code": "3354", "name": "Dusty Rose - Light", "hex": "#E4A6A9"},
    {"code": "3362", "name": "Pine Green - Dark", "hex": "#5E6D4F"},
    {"code": "3363", "name": "Pine Green - Medium", "hex": "#728266"},
    {"code": "3364", "name": "Pine Green", "hex": "#838D66"},
    {"code": "3371", "name": "Black Brown", "hex": "#1C1108"},
    {"code": "3607", "name": "Plum - Light", "hex": "#C5357D"},
    {"code": "3608", "name": "Plum - Very Light", "hex": "#EA87B4"},
    {"code": "3609", "name": "Plum - Ultra Light", "hex": "#F4A6C6"},
    {"code": "3685", "name": "Mauve - Very Dark", "hex": "#88254D"},
    {"code": "3687", "name": "Mauve", "hex": "#C96785"},
    {"code": "3688", "name": "Mauve - Medium", "hex": "#E8A0B2"},
    {"code": "3689", "name": "Mauve - Light", "hex": "#FBC3D0"},
    {"code": "3705", "name": "Melon - Dark", "hex": "#FF6E7A"},
    {"code": "3706", "name": "Melon - Medium", "hex": "#FF969D"},
    {"code": "3708", "name": "Melon - Light", "hex": "#FFBEC3"},
    {"code": "3712", "name": "Salmon - Medium", "hex": "#F1837A"},
    {"code": "3713", "name": "Salmon - Very Light", "hex": "#FFDBD8"},
    {"code": "3716", "name": "Dusty Rose - Medium Light", "hex": "#FFBDC6"},
    {"code": "3721", "name": "Shell Pink - Dark", "hex": "#A14C5A"},
    {"code": "3722", "name": "Shell Pink - Medium", "hex": "#BC6769"},
    {"code": "3726", "name": "Antique Mauve - Dark", "hex": "#9D5968"},
    {"code": "3727", "name": "Antique Mauve - Light", "hex": "#DBACB7"},
    {"code": "3731", "name": "Dusty Rose - Very Dark", "hex": "#D86680"},
    {"code": "3733", "name": "Dusty Rose", "hex": "#E8899C"},
    {"code": "3740", "name": "Antique Violet - Dark", "hex": "#786074"},
    {"code": "3743", "name": "Antique Violet - Very Light", "hex": "#D7CBD6"},
    {"code": "3746", "name": "Blue Violet - Dark", "hex": "#776FA4"},
    {"code": "3747", "name": "Blue Violet - Very Light", "hex": "#D3D6EB"},
    {"code": "3750", "name": "Antique Blue - Very Dark", "hex": "#3E5671"},
    {"code": "3752", "name": "Antique Blue - Very Light", "hex": "#C6D5E1"},
    {"code": "3753", "name": "Antique Blue - Ultra Very Light", "hex": "#DBE7ED"},
    {"code": "3755", "name": "Baby Blue", "hex": "#9FC3DA"},
    {"code": "3756", "name": "Baby Blue - Ultra Very Light", "hex": "#EEFBFD"},
    {"code": "3760", "name": "Wedgwood", "hex": "#3E8DA5"},
    {"code": "3761", "name": "Sky Blue - Light", "hex": "#AED7E5"},
    {"code": "3765", "name": "Peacock Blue - Very Dark", "hex": "#348B95"},
    {"code": "3766", "name": "Peacock Blue - Light", "hex": "#99CCD3"},
    {"code": "3768", "name": "Gray Green - Dark", "hex": "#657B7A"},
    {"code": "3770", "name": "Tawny - Very Light", "hex": "#FFF4E3"},
    {"code": "3771", "name": "Terra Cotta - Ultra Very Light", "hex": "#F4BDA5"},
    {"code": "3772", "name": "Desert Sand - Very Dark", "hex": "#A0634E"},
    {"code": "3773", "name": "Desert Sand - Medium", "hex": "#D09B82"},
    {"code": "3774", "name": "Desert Sand - Very Light", "hex": "#F5E1D6"},
    {"code": "3776", "name": "Mahogany - Light", "hex": "#CF7131"},
    {"code": "3777", "name": "Terra Cotta - Very Dark", "hex": "#863225"},
    {"code": "3778", "name": "Terra Cotta - Light", "hex": "#D98A79"},
    {"code": "3779", "name": "Terra Cotta - Ultra Very Light", "hex": "#F8C9BB"},
    {"code": "3781", "name": "Mocha Brown - Dark", "hex": "#6B5540"},
    {"code": "3782", "name": "Mocha Brown - Light", "hex": "#D2BB9D"},
    {"code": "3787", "name": "Brown Gray - Dark", "hex": "#6E6558"},
    {"code": "3790", "name": "Beige Gray - Ultra Dark", "hex": "#746655"},
    {"code": "3799", "name": "Pewter Gray - Very Dark", "hex": "#424242"},
    {"code": "3801", "name": "Melon - Very Dark", "hex": "#E74967"},
    {"code": "3802", "name": "Antique Mauve - Very Dark", "hex": "#714050"},
    {"code": "3803", "name": "Mauve - Dark", "hex": "#AB3357"},
    {"code": "3804", "name": "Cyclamen Pink - Dark", "hex": "#E02876"},
    {"code": "3805", "name": "Cyclamen Pink", "hex": "#F3478A"},
    {"code": "3806", "name": "Cyclamen Pink - Light", "hex": "#FF7EB0"},
    {"code": "3807", "name": "Cornflower Blue", "hex": "#607E9E"},
    {"code": "3808", "name": "Turquoise - Ultra Very Dark", "hex": "#366970"},
    {"code": "3809", "name": "Turquoise - Very Dark", "hex": "#3F8F94"},
    {"code": "3810", "name": "Turquoise - Dark", "hex": "#48A8AD"},
    {"code": "3811", "name": "Turquoise - Very Light", "hex": "#BCE3E6"},
    {"code": "3812", "name": "Seagreen - Very Dark", "hex": "#2F9E8A"},
    {"code": "3813", "name": "Blue Green - Light", "hex": "#B2D6C6"},
    {"code": "3814", "name": "Aquamarine", "hex": "#508F7C"},
    {"code": "3815", "name": "Celadon Green - Dark", "hex": "#477A60"},
    {"code": "3816", "name": "Celadon Green", "hex": "#65A581"},
    {"code": "3817", "name": "Celadon Green - Light", "hex": "#9BD3B4"},
    {"code": "3818", "name": "Emerald Green - Ultra Very Dark", "hex": "#115740"},
    {"code": "3819", "name": "Moss Green - Light", "hex": "#E0E868"},
    {"code": "3820", "name": "Straw - Dark", "hex": "#DFB23E"},
    {"code": "3821", "name": "Straw", "hex": "#F3C855"},
    {"code": "3822", "name": "Straw - Light", "hex": "#F6D77E"},
    {"code": "3823", "name": "Yellow - Ultra Pale", "hex": "#FFFDE3"},
    {"code": "3824", "name": "Apricot - Light", "hex": "#FED2C4"},
    {"code": "3825", "name": "Pumpkin - Pale", "hex": "#FEB977"},
    {"code": "3826", "name": "Golden Brown", "hex": "#AD7340"},
    {"code": "3827", "name": "Golden Brown - Pale", "hex": "#F7BB77"},
    {"code": "3828", "name": "Hazelnut Brown", "hex": "#B78C58"},
    {"code": "3829", "name": "Old Gold - Very Dark", "hex": "#AA7A19"},
    {"code": "3830", "name": "Terra Cotta", "hex": "#BC6148"},
    {"code": "3831", "name": "Raspberry - Dark", "hex": "#B43354"},
    {"code": "3832", "name": "Raspberry - Medium", "hex": "#DB536E"},
    {"code": "3833", "name": "Raspberry - Light", "hex": "#EA7F91"},
    {"code": "3834", "name": "Grape - Dark", "hex": "#724264"},
    {"code": "3835", "name": "Grape - Medium", "hex": "#946A88"},
    {"code": "3836", "name": "Grape - Light", "hex": "#BA92AF"},
    {"code": "3837", "name": "Lavender - Ultra Dark", "hex": "#6C3461"},
    {"code": "3838", "name": "Lavender Blue - Dark", "hex": "#5C78A3"},
    {"code": "3839", "name": "Lavender Blue - Medium", "hex": "#7B98BD"},
    {"code": "3840", "name": "Lavender Blue - Light", "hex": "#B0C4DB"},
    {"code": "3841", "name": "Baby Blue - Pale", "hex": "#CDDFED"},
    {"code": "3842", "name": "Wedgwood - Dark", "hex": "#32758E"},
    {"code": "3843", "name": "Electric Blue", "hex": "#14AAD2"},
    {"code": "3844", "name": "Turquoise - Bright - Dark", "hex": "#12A9B1"},
    {"code": "3845", "name": "Turquoise - Bright - Medium", "hex": "#04C4CA"},
    {"code": "3846", "name": "Turquoise - Bright - Light", "hex": "#06E3E8"},
    {"code": "3847", "name": "Teal Green - Dark", "hex": "#347873"},
    {"code": "3848", "name": "Teal Green - Medium", "hex": "#559490"},
    {"code": "3849", "name": "Teal Green - Light", "hex": "#52B3A8"},
    {"code": "3850", "name": "Bright Green - Dark", "hex": "#378674"},
    {"code": "3851", "name": "Bright Green - Light", "hex": "#49A989"},
    {"code": "3852", "name": "Straw - Very Dark", "hex": "#CD9D2B"},
    {"code": "3853", "name": "Autumn Gold - Dark", "hex": "#F29746"},
    {"code": "3854", "name": "Autumn Gold - Medium", "hex": "#F2AD6C"},
    {"code": "3855", "name": "Autumn Gold - Light", "hex": "#FAD396"},
    {"code": "3856", "name": "Mahogany - Ultra Very Light", "hex": "#FFC19E"},
    {"code": "3857", "name": "Rosewood - Dark", "hex": "#68352C"},
    {"code": "3858", "name": "Rosewood - Medium", "hex": "#965044"},
    {"code": "3859", "name": "Rosewood - Light", "hex": "#BA8B7C"},
    {"code": "3860", "name": "Cocoa", "hex": "#7A5E55"},
    {"code": "3861", "name": "Cocoa - Light", "hex": "#A6877C"},
    {"code": "3862", "name": "Mocha Beige - Dark", "hex": "#8A6D51"},
    {"code": "3863", "name": "Mocha Beige - Medium", "hex": "#A78B70"},
    {"code": "3864", "name": "Mocha Beige - Light", "hex": "#CBB99E"},
    {"code": "3865", "name": "Winter White", "hex": "#FAF8F4"},
    {"code": "3866", "name": "Mocha Brown - Ultra Very Light", "hex": "#FAF4EC"},
]

SYMBOLS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&*+-=~^<>!?/|"
NO_STITCH = 65535


def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip("#")
    return tuple(int(hex_str[i : i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(r, g, b):
    return f"#{int(r):02x}{int(g):02x}{int(b):02x}"


def color_distance(rgb1, rgb2):
    r_mean = (rgb1[0] + rgb2[0]) / 2
    dr = rgb1[0] - rgb2[0]
    dg = rgb1[1] - rgb2[1]
    db = rgb1[2] - rgb2[2]
    r_weight = 2 + r_mean / 256
    g_weight = 4
    b_weight = 2 + (255 - r_mean) / 256
    return math.sqrt(r_weight * dr * dr + g_weight * dg * dg + b_weight * db * db)


DMC_COLORS_RGB = [
    {"color": color, "rgb": hex_to_rgb(color["hex"])} for color in DMC_COLORS
]


class ColorCount:
    def __init__(self, rgb, count):
        self.rgb = rgb
        self.count = count


class ColorBox:
    def __init__(self, color_counts):
        self.colors = color_counts
        self.r_min, self.r_max = 255, 0
        self.g_min, self.g_max = 255, 0
        self.b_min, self.b_max = 255, 0
        self.calculate_bounds()

    def calculate_bounds(self):
        for c in self.colors:
            self.r_min = min(self.r_min, c.rgb[0])
            self.r_max = max(self.r_max, c.rgb[0])
            self.g_min = min(self.g_min, c.rgb[1])
            self.g_max = max(self.g_max, c.rgb[1])
            self.b_min = min(self.b_min, c.rgb[2])
            self.b_max = max(self.b_max, c.rgb[2])

    @property
    def volume(self):
        return max(self.r_max - self.r_min, self.g_max - self.g_min, self.b_max - self.b_min)


def calculate_dimensions(img_width, img_height, max_width, max_height):
    aspect_ratio = img_width / img_height
    width = max_width
    height = round(width / aspect_ratio)
    if height > max_height:
        height = max_height
        width = round(height * aspect_ratio)
    return max(1, width), max(1, height)


def median_cut(color_counts, num_colors):
    if not color_counts:
        return []
    if len(color_counts) <= num_colors:
        return [c.rgb for c in color_counts]

    initial_box = ColorBox(color_counts)
    boxes = [initial_box]

    while len(boxes) < num_colors:
        max_volume = 0
        max_box_index = -1
        for i, box in enumerate(boxes):
            if box.volume > max_volume and len(box.colors) > 1:
                max_volume = box.volume
                max_box_index = i

        if max_box_index == -1:
            break

        box_to_split = boxes.pop(max_box_index)
        r_range = box_to_split.r_max - box_to_split.r_min
        g_range = box_to_split.g_max - box_to_split.g_min
        b_range = box_to_split.b_max - box_to_split.b_min

        channel = 0
        if g_range >= r_range and g_range >= b_range:
            channel = 1
        elif b_range >= r_range and b_range >= g_range:
            channel = 2
        
        box_to_split.colors.sort(key=lambda c: c.rgb[channel])

        total_count = sum(c.count for c in box_to_split.colors)
        median_index = 0
        cum_count = 0
        for i, c in enumerate(box_to_split.colors):
            cum_count += c.count
            if cum_count >= total_count / 2:
                median_index = max(1, i)
                break
        
        colors1 = box_to_split.colors[:median_index]
        colors2 = box_to_split.colors[median_index:]

        if colors1:
            boxes.append(ColorBox(colors1))
        if colors2:
            boxes.append(ColorBox(colors2))

    palette = []
    for box in boxes:
        total_r, total_g, total_b, total_count = 0, 0, 0, 0
        for c in box.colors:
            total_r += c.rgb[0] * c.count
            total_g += c.rgb[1] * c.count
            total_b += c.rgb[2] * c.count
            total_count += c.count
        palette.append(
            (
                round(total_r / total_count),
                round(total_g / total_count),
                round(total_b / total_count),
            )
        )
    return palette


def find_closest_palette_index(rgb, palette):
    min_dist = float("inf")
    closest_index = 0
    for i, p_rgb in enumerate(palette):
        dist = color_distance(rgb, p_rgb)
        if dist < min_dist:
            min_dist = dist
            closest_index = i
    return closest_index


def map_to_dmc(quantized_colors):
    used_dmc = set()
    result = []
    for rgb in quantized_colors:
        min_dist = float("inf")
        closest_dmc = None
        for dmc_item in DMC_COLORS_RGB:
            already_used = dmc_item["color"]["code"] in used_dmc
            dist = color_distance(rgb, dmc_item["rgb"])
            adjusted_dist = dist * 1.5 if already_used else dist
            if adjusted_dist < min_dist:
                min_dist = adjusted_dist
                closest_dmc = dmc_item["color"]
        if closest_dmc:
            used_dmc.add(closest_dmc["code"])
            result.append({"dmc": closest_dmc, "original_rgb": rgb})
    return result


def convert_image_to_pattern(image_path, options):
    try:
        img = Image.open(image_path)
    except Exception as e:
        print(f"Error opening image {image_path}: {e}", file=sys.stderr)
        return None

    img_width, img_height = img.size
    
    if options.get("resize"):
        width, height = calculate_dimensions(
            img_width, img_height, options["max_width"], options["max_height"]
        )
    else:
        width, height = img_width, img_height

    img = img.resize((width, height), Image.Resampling.LANCZOS)
    img_data = img.convert("RGBA").getdata()

    color_map = defaultdict(int)
    for r, g, b, a in img_data:
        if a < 128:
            continue
        color_map[(r, g, b)] += 1

    color_counts = [ColorCount(rgb, count) for rgb, count in color_map.items()]
    quantized_colors = median_cut(color_counts, options["max_colors"])

    if options["use_dmc_colors"]:
        dmc_mappings = map_to_dmc(quantized_colors)
        palette = [
            {
                "name": m["dmc"]["name"],
                "brand": "DMC",
                "code": m["dmc"]["code"],
                "hex": m["dmc"]["hex"],
            }
            for m in dmc_mappings
        ]
        palette_rgb = [hex_to_rgb(p["hex"]) for p in palette]
    else:
        palette = [
            {
                "name": f"Color {i+1}",
                "hex": rgb_to_hex(*rgb),
            }
            for i, rgb in enumerate(quantized_colors)
        ]
        palette_rgb = quantized_colors

    targets = [0] * (width * height)
    pixel_data = list(img.convert("RGBA").getdata())

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixel_data[y * width + x]
            cell_index = y * width + x
            if a < 128:
                targets[cell_index] = NO_STITCH
            else:
                quantized_index = find_closest_palette_index((r, g, b), quantized_colors)
                if options["use_dmc_colors"]:
                    targets[cell_index] = find_closest_palette_index(
                        quantized_colors[quantized_index], palette_rgb
                    )
                else:
                    targets[cell_index] = quantized_index
    
    # Prune unused palette entries
    used_indices = sorted(list(set(t for t in targets if t != NO_STITCH)))
    if not used_indices:
        print(f"No stitches found for {image_path}", file=sys.stderr)
        return None
        
    index_remap = {old_index: new_index for new_index, old_index in enumerate(used_indices)}
    new_palette = [palette[i] for i in used_indices]
    
    for i in range(len(targets)):
        if targets[i] != NO_STITCH:
            targets[i] = index_remap[targets[i]]

    return {
        "width": width,
        "height": height,
        "palette": new_palette,
        "targets": targets,
        "meta": {
            "title": options.get("title") or os.path.basename(image_path).rsplit(".", 1)[0],
            "author": "Image Converter",
            "instructions": f"Converted from {os.path.basename(image_path)} ({img_width}x{img_height} -> {width}x{height})",
        },
    }


def create_oxs_file(pattern_doc):
    chart = Element("chart")
    props = SubElement(
        chart,
        "properties",
        {
            "oxsversion": "1.0",
            "chartwidth": str(pattern_doc["width"]),
            "chartheight": str(pattern_doc["height"]),
            "charttitle": pattern_doc["meta"]["title"],
            "author": pattern_doc["meta"]["author"],
            "instructions": pattern_doc["meta"]["instructions"],
            "stitchesperinch": "14",
            "palettecount": str(len(pattern_doc["palette"])),
        },
    )

    palette_el = SubElement(chart, "palette")
    SubElement(
        palette_el,
        "palette_item",
        index="0",
        number="cloth",
        name="cloth",
        color="ffffff",
    )
    for i, p in enumerate(pattern_doc["palette"]):
        SubElement(
            palette_el,
            "palette_item",
            index=str(i + 1),
            number=p.get("code", ""),
            name=p["name"],
            color=p["hex"].lstrip("#"),
            symbol=SYMBOLS[i % len(SYMBOLS)],
        )

    stitches_el = SubElement(chart, "fullstitches")
    for y in range(pattern_doc["height"]):
        for x in range(pattern_doc["width"]):
            target_index = pattern_doc["targets"][y * pattern_doc["width"] + x]
            if target_index != NO_STITCH:
                SubElement(
                    stitches_el, "stitch", x=str(x), y=str(y), palindex=str(target_index + 1)
                )

    return '<?xml version="1.0" encoding="UTF-8"?>' + tostring(chart, encoding="unicode")


def main():
    parser = argparse.ArgumentParser(
        description="Convert images to OXS cross-stitch patterns."
    )
    parser.add_argument("files", nargs="+", help="Image files to convert.")
    parser.add_argument("--max-width", type=int, default=150, help="Maximum width of the pattern (only used with --resize).")
    parser.add_argument("--max-height", type=int, default=150, help="Maximum height of the pattern (only used with --resize).")
    parser.add_argument("--max-colors", type=int, default=64, help="Maximum number of colors.")
    parser.add_argument("--no-dmc", action="store_false", dest="use_dmc_colors", help="Don't map to DMC colors.")
    parser.add_argument("--resize", action="store_true", help="Resize image to fit max-width and max-height. Default is to use original image size.")
    parser.set_defaults(use_dmc_colors=True, resize=False)

    args = parser.parse_args()

    options = {
        "max_width": args.max_width,
        "max_height": args.max_height,
        "max_colors": args.max_colors,
        "use_dmc_colors": args.use_dmc_colors,
        "resize": args.resize,
    }

    for image_path in args.files:
        print(f"Processing {image_path}...")
        pattern_doc = convert_image_to_pattern(image_path, options)
        if pattern_doc:
            oxs_content = create_oxs_file(pattern_doc)
            output_path = os.path.splitext(image_path)[0] + ".oxs"
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(oxs_content)
            print(f"Saved pattern to {output_path}")


if __name__ == "__main__":
    main()