import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── WELL DATA (Groundwater Levels - mbgl, Jan-Dec 2024) ────────────────────
const WELLS = [
  { taluk:"Anekal", loc:"Anekal", lat:12.7121, lon:77.6967, months:[55.8,56.9,57,34.2,43.3,41.5,41.4,59.9,60.3,48,47.9,48.2] },
  { taluk:"Anekal", loc:"Attibele", lat:12.7787, lon:77.7676, months:[25.5,26,37,60.3,61.5,59.3,59.15,29.4,29.2,19.2,20,20.6] },
  { taluk:"Anekal", loc:"Jigani", lat:12.7961, lon:77.6389, months:[11.1,12.8,13.3,18.6,15.9,12,11.8,9.36,10.2,10.5,12,12.4] },
  { taluk:"Anekal", loc:"Bannerughatta", lat:12.8667, lon:77.5897, months:[8.7,9.1,8.9,11.1,9.2,8.5,8.1,8,7.9,6.9,7.3,7.2] },
  { taluk:"Anekal", loc:"Sarjapura", lat:12.8598, lon:77.7838, months:[22.7,23.2,23.9,34.6,26.1,25.3,25.1,26.2,26.8,26.3,25.1,25.8] },
  { taluk:"Anekal", loc:"Chandapura", lat:12.8242, lon:77.6929, months:[23.7,24.3,24.5,24.6,25.6,24.3,23.8,24.3,24.7,24.6,24,24.2] },
  { taluk:"Anekal", loc:"Kammasandra", lat:12.83, lon:77.72, months:[113.4,115,116.5,88.6,88.8,82.3,81.5,108,110,108,107.6,107.9] },
  { taluk:"Anekal", loc:"Marsur", lat:12.8, lon:77.75, months:[21.5,22.3,23.2,22.5,22.2,21.1,20,18.2,18.8,16,16.2,15.9] },
  { taluk:"Bengaluru North", loc:"Thimmenahalli", lat:13.0833, lon:77.55, months:[23.6,25.1,25.7,24.2,23,22.6,21.7,17.7,18.6,10.9,13,13.5] },
  { taluk:"Bengaluru North", loc:"High Court", lat:12.977, lon:77.57, months:[9.5,10.1,10.6,10.8,10.2,9.3,9.1,9.74,9.5,8.8,8.5,9.1] },
  { taluk:"Bengaluru North", loc:"Byadarahalli", lat:12.95, lon:77.48, months:[37.1,38,38.1,38.2,37.7,35.2,34.9,34.6,34.8,30.2,31.4,31.1] },
  { taluk:"Bengaluru North", loc:"Chikkabanavara", lat:13.0833, lon:77.4833, months:[22.5,23.2,25.3,27.6,30.5,34.3,33.9,20.79,23.2,26.3,25.4,26.2] },
  { taluk:"Bengaluru North", loc:"Sondekoppa", lat:13.0667, lon:77.4333, months:[6.3,7.2,8.1,9.7,7.9,4.8,4.6,3.1,4,2.5,3,3.7] },
  { taluk:"Bengaluru North", loc:"Thotagere", lat:13.1167, lon:77.5, months:[31.8,35,36.3,39.4,38.9,37,36.3,31.75,32.2,27.3,25.3,25.1] },
  { taluk:"Bengaluru North", loc:"Adikemaranahalli", lat:13.0, lon:77.55, months:[17.8,19.1,20.1,21.5,21.1,20.6,19.75,19.35,19.6,16.2,15.4,15.5] },
  { taluk:"Bengaluru North", loc:"Sadashivanagara", lat:13.005, lon:77.5697, months:[7.7,7.8,8.5,9.3,8.2,7,6,5.7,6,5,5.3,5.5] },
  { taluk:"Bengaluru North", loc:"Bagalagunte", lat:13.05, lon:77.5167, months:[21.1,22.2,26.3,27.1,25.5,24.1,22.5,18.8,18.7,7.2,13,13.4] },
  { taluk:"Bengaluru North", loc:"Jalahalli", lat:13.052, lon:77.519, months:[20.7,21.4,22.5,22.7,22.4,26.7,24.3,19.8,20.5,18.2,17.8,18.9] },
  { taluk:"Bengaluru North", loc:"Laggere (Peenya)", lat:12.9833, lon:77.5167, months:[16.9,17.1,11.4,23.7,23.6,22.9,21,21.3,21.8,13.6,15.9,15] },
  { taluk:"Bengaluru North", loc:"Hebbala Kempapura", lat:13.0333, lon:77.5833, months:[68.5,69,61.1,73,74.8,72.3,72.1,70.7,71.3,23,23,33] },
  { taluk:"Bengaluru North", loc:"Dasanapura", lat:13.0667, lon:77.4667, months:[35.6,37,39.1,39.6,41.6,40.4,39.2,45.7,46.8,43.2,30.9,31.5] },
  { taluk:"Bengaluru South", loc:"Beguru", lat:12.9058, lon:77.6172, months:[22.3,22.9,24.1,25.1,24.8,23.8,22.4,23.7,24.9,20.9,22.5,23.4] },
  { taluk:"Bengaluru South", loc:"Tavarekere", lat:12.9393, lon:77.6107, months:[22.6,24.1,24.2,null,null,23,21.5,16.4,14.6,12.2,12.5,12.7] },
  { taluk:"Bengaluru South", loc:"Kethohalli", lat:12.9, lon:77.5333, months:[25.2,26,27.8,55,49.8,15.4,13.2,6.7,8.1,8.2,11.5,11.9] },
  { taluk:"Bengaluru South", loc:"Marenahalli", lat:12.88, lon:77.55, months:[16.8,17.5,17.8,39,36.2,33.1,31.1,15.9,15.5,13.9,8,8.8] },
  { taluk:"Bengaluru South", loc:"Rajarajeshwarinagara", lat:12.9239, lon:77.507, months:[17.7,18.6,18.8,18.4,17.7,15.6,14,16.5,16.3,13.5,13.9,14.6] },
  { taluk:"Bengaluru South", loc:"Chandrappa Circle", lat:12.92, lon:77.56, months:[11,11.8,12,16,13.1,3.5,2.9,1.9,1.6,1.4,0,0] },
  { taluk:"Bengaluru South", loc:"Agara", lat:12.9167, lon:77.6333, months:[null,48.6,61.5,23.2,23,12.9,12.5,22.9,23,22.1,11.9,12.8] },
  { taluk:"Bengaluru South", loc:"Thataguni", lat:12.87, lon:77.58, months:[null,41.8,48.5,48.8,48.5,30.3,28.6,28.1,28.7,27.5,28,29.1] },
  { taluk:"Bengaluru South", loc:"Kumbalagodu", lat:12.93, lon:77.48, months:[null,null,null,null,null,60.2,57.1,57,58,57.2,57.3,59.1] },
  { taluk:"Bengaluru South", loc:"Vajarahalli", lat:12.8686, lon:77.5469, months:[36.1,36.9,37.3,49,36.9,20.8,19.6,48.9,48,28,28.2,29.1] },
  { taluk:"Bengaluru East", loc:"Avalahalli", lat:12.9833, lon:77.7333, months:[93.5,93.6,95.3,96.4,95.6,94.2,93.7,95.2,96,95,95.1,96.4] },
  { taluk:"Bengaluru East", loc:"Manduru", lat:13.0667, lon:77.7667, months:[16,16.3,16.5,16.7,16.3,15.8,15.4,15,15.6,14.5,13.6,13.8] },
  { taluk:"Bengaluru East", loc:"Devarabeesanahalli", lat:12.9667, lon:77.6833, months:[12.1,12.6,13.2,11.9,9.5,8.7,7.3,11.8,11.6,8.6,4.1,4.7] },
  { taluk:"Bengaluru East", loc:"Kalkere", lat:13.0, lon:77.7, months:[46.1,null,null,null,null,67.8,67.7,67.3,68,65,52.8,53.8] },
  { taluk:"Bengaluru East", loc:"Doddakannahalli", lat:12.8833, lon:77.6833, months:[49.3,51,51.3,49.4,49.1,48.2,48,48.7,49.2,45.6,47.1,47.5] },
  { taluk:"Bengaluru East", loc:"Mahadevapura", lat:12.9917, lon:77.7133, months:[4.5,5.1,4.4,5,4.2,3.8,3.8,3.8,3.7,3.6,4.1,3.9] },
  { taluk:"Bengaluru East", loc:"Bileshivale", lat:13.0167, lon:77.6833, months:[56.8,78.6,90.1,null,null,null,null,null,null,153,181,101.6] },
  { taluk:"Bengaluru East", loc:"Vibhuthipura", lat:12.9667, lon:77.7, months:[18.6,19.1,19.4,19.8,19.9,18.1,19.3,19,19.2,18.3,40.1,40.5] },
  { taluk:"Bengaluru East", loc:"Bidarahalli", lat:13.0, lon:77.75, months:[11.3,11.7,11.9,18.2,18.5,17.3,17.6,15.3,15.4,21.1,21,21.5] },
  { taluk:"Bengaluru East", loc:"Siddapura", lat:12.9833, lon:77.7167, months:[null,null,null,null,null,48.6,48.4,48.2,49,47.6,35.1,36.5] },
  { taluk:"Yelahanka", loc:"Rajanukunte", lat:13.1333, lon:77.5833, months:[28.3,29.5,31.5,31.9,32.7,30.2,29.8,31.4,32.3,29.7,29.8,30.6] },
  { taluk:"Yelahanka", loc:"Yelahanka", lat:13.1, lon:77.5958, months:[11.9,13.4,12.5,13.8,13.1,11,10.5,12.5,12.8,10,9.8,10] },
  { taluk:"Yelahanka", loc:"Hessaragatha", lat:13.1333, lon:77.6333, months:[12.1,12.3,11.3,11.4,11.2,12.7,11.9,12.3,11.8,11.1,11.3,11.5] },
  { taluk:"Yelahanka", loc:"Doddajala", lat:13.1667, lon:77.5833, months:[59.6,68.8,69.2,70,69.7,68.9,68.2,68,68.1,67.5,65.3,65.7] },
  { taluk:"Yelahanka", loc:"Maralakunte", lat:13.1667, lon:77.6, months:[null,null,null,null,null,58.9,58.3,58.1,58.9,58.5,56.1,56.9] },
  { taluk:"Yelahanka", loc:"Sonappanahalli", lat:13.1833, lon:77.5667, months:[null,33,29.6,29.3,25.5,24.2,21.4,23.7,24,22.4,21.6,21.8] },
  { taluk:"Yelahanka", loc:"Mylapanahalli", lat:13.1833, lon:77.55, months:[null,16.5,19.2,22.3,19.6,19.3,19.2,15.8,15.9,13.3,15.2,15.6] },
  { taluk:"Yelahanka", loc:"Doddabyalakere", lat:13.15, lon:77.6167, months:[23,23.2,19.5,18.7,20,19,18.6,18.4,19.6,18.8,14.5,14.8] },
  { taluk:"Yelahanka", loc:"Kakolu", lat:13.1167, lon:77.5167, months:[24.6,24.9,23.8,23.8,24.1,23.8,23.5,23.4,23.9,22.4,23.3,23.9] },
  { taluk:"Yelahanka", loc:"Bagaluru", lat:13.1333, lon:77.6667, months:[24.2,25.6,19.9,19.4,20,19.5,19.1,20.3,20.7,19.8,20,20.5] },
];

// ─── WATER QUALITY DATA (Table 5 – Trend 2024) ──────────────────────────────
interface WaterQuality {
  ph: number; colour: number; turbidity: number; tds: number;
  alkalinity: number; th: number; ca: number; mg: number;
  cl: number; so4: number; f: number; no3: number; fe: number;
}
const WATER_QUALITY: Record<string, WaterQuality> = {
  "Marsur":              { ph:7.9, colour:1, turbidity:3.8, tds:700, alkalinity:196.5, th:343.7, ca:85, mg:32.7, cl:153.5, so4:42, f:0.6, no3:18.4, fe:0.1 },
  "Kammasandra":         { ph:7.7, colour:1, turbidity:5, tds:1040, alkalinity:271.7, th:485.2, ca:125.9, mg:42.6, cl:299.5, so4:44.7, f:0.5, no3:20.7, fe:0.1 },
  "Avalahalli":          { ph:8.1, colour:1, turbidity:3.4, tds:1040, alkalinity:355.3, th:525.7, ca:130.8, mg:49.6, cl:172.2, so4:54.4, f:0.5, no3:39.6, fe:0.19 },
  "Manduru":             { ph:7.5, colour:1, turbidity:3.9, tds:340, alkalinity:133.8, th:149.6, ca:32.7, mg:16.9, cl:41.2, so4:35.9, f:0.5, no3:14.1, fe:0 },
  "Devarabeesanahalli":  { ph:8.1, colour:1, turbidity:3.8, tds:760, alkalinity:292.6, th:314.4, ca:89.9, mg:21.8, cl:140.4, so4:73, f:0.3, no3:17.3, fe:0.1 },
  "Kalkere":             { ph:7.4, colour:1, turbidity:3.8, tds:980, alkalinity:292.6, th:424.6, ca:130.8, mg:24.8, cl:271.4, so4:49.2, f:0.8, no3:39.8, fe:0.18 },
  "Siddapura":           { ph:7.7, colour:1, turbidity:3.8, tds:600, alkalinity:188.1, th:262.8, ca:65.4, mg:28.8, cl:149.7, so4:35.5, f:0.7, no3:16.8, fe:0.16 },
  "Mahadevapura":        { ph:7.8, colour:1, turbidity:3.4, tds:740, alkalinity:188.1, th:363.9, ca:93.2, mg:32.7, cl:196.5, so4:24.1, f:0.6, no3:15.7, fe:0.1 },
  "Bileshivale":         { ph:7.4, colour:1, turbidity:2.9, tds:940, alkalinity:229.9, th:412.5, ca:114.4, mg:31.7, cl:280.8, so4:50.7, f:0.4, no3:40.9, fe:0.21 },
  "Vibhuthipura":        { ph:7.7, colour:1, turbidity:2.8, tds:760, alkalinity:209, th:343.7, ca:81.7, mg:39.8, cl:205.9, so4:38.4, f:0.8, no3:24.7, fe:0.14 },
  "Bidarahalli":         { ph:7.7, colour:1, turbidity:2.8, tds:740, alkalinity:229.9, th:331.6, ca:89.9, mg:26.8, cl:196.5, so4:36.5, f:1, no3:10.6, fe:0.1 },
  "Thimmenahalli":       { ph:7.8, colour:1, turbidity:0.9, tds:270, alkalinity:112.9, th:121.3, ca:27.8, mg:12.9, cl:28.1, so4:16.8, f:0.8, no3:13.5, fe:0 },
  "Byadarahalli":        { ph:7.8, colour:1, turbidity:3.4, tds:860, alkalinity:342.8, th:412.5, ca:98.1, mg:41.6, cl:97.3, so4:54.5, f:0.2, no3:14, fe:0.2 },
  "Chikkabanavara":      { ph:7.8, colour:1, turbidity:4.1, tds:1060, alkalinity:292.6, th:396.1, ca:89.4, mg:41.6, cl:190.9, so4:47.4, f:0.6, no3:14.5, fe:0.2 },
  "Sondekoppa":          { ph:7.5, colour:1, turbidity:3.8, tds:780, alkalinity:301, th:367.5, ca:101.4, mg:27.8, cl:131, so4:47.4, f:0.6, no3:11.4, fe:0.23 },
  "Thotagere":           { ph:7.3, colour:1, turbidity:3.2, tds:600, alkalinity:217.4, th:253.2, ca:40.9, mg:36.7, cl:149.7, so4:43.2, f:0.5, no3:21, fe:0.15 },
  "Adikemaranahalli":    { ph:8.1, colour:1, turbidity:4.2, tds:580, alkalinity:209, th:323.5, ca:51.7, mg:29.7, cl:131, so4:20.5, f:0.5, no3:15.3, fe:0.11 },
  "Sadashivanagara":     { ph:7.6, colour:1, turbidity:3.9, tds:520, alkalinity:209, th:262.8, ca:73.6, mg:19.8, cl:74.9, so4:11.1, f:0.5, no3:13.5, fe:0.15 },
  "Bagalagunte":         { ph:7.3, colour:1, turbidity:3.9, tds:560, alkalinity:133.4, th:142.9, ca:19.6, mg:22.8, cl:224.6, so4:63.8, f:0.8, no3:14.9, fe:0.1 },
  "Jalahalli":           { ph:7.4, colour:1, turbidity:3.4, tds:960, alkalinity:250.8, th:262.8, ca:73.6, mg:19.8, cl:74.9, so4:21.5, f:1.2, no3:13.6, fe:0.1 },
  "Laggere (Peenya)":    { ph:7.2, colour:1, turbidity:3.4, tds:970, alkalinity:229.9, th:485.2, ca:112.6, mg:44.6, cl:190.9, so4:84.9, f:0.3, no3:35.5, fe:0.19 },
  "Hebbala Kempapura":   { ph:7.3, colour:1, turbidity:3.2, tds:480, alkalinity:196.5, th:250.7, ca:65.4, mg:21.8, cl:59.9, so4:11.4, f:0.3, no3:19, fe:0.12 },
  "Dasanapura":          { ph:7.5, colour:1, turbidity:3.1, tds:800, alkalinity:250.8, th:432.7, ca:122.6, mg:31.7, cl:144.1, so4:29.8, f:0.5, no3:16.6, fe:0.11 },
  "Beguru":              { ph:7.6, colour:1, turbidity:4.2, tds:590, alkalinity:196.5, th:262.8, ca:65.4, mg:24.8, cl:116, so4:32.4, f:0.5, no3:38.3, fe:0.16 },
  "Tavarekere":          { ph:7.6, colour:1, turbidity:4.3, tds:590, alkalinity:196.5, th:262.8, ca:65.4, mg:24.8, cl:116, so4:32.4, f:0.5, no3:38.3, fe:0.16 },
  "Kethohalli":          { ph:7.8, colour:1, turbidity:4.6, tds:680, alkalinity:271.7, th:314.4, ca:76.8, mg:29.7, cl:127.1, so4:40, f:0.9, no3:14.5, fe:0.1 },
  "Marenahalli":         { ph:7.5, colour:1, turbidity:4.5, tds:800, alkalinity:321.9, th:372, ca:96.1, mg:31.7, cl:116, so4:50, f:0.7, no3:40.9, fe:0.23 },
  "Rajarajeshwarinagara":{ ph:7.6, colour:1, turbidity:3.2, tds:740, alkalinity:259.2, th:372, ca:85, mg:39.7, cl:84.2, so4:49.1, f:0.7, no3:27.2, fe:0.11 },
  "Chandrappa Circle":   { ph:7.6, colour:1, turbidity:3.2, tds:740, alkalinity:259.2, th:372, ca:85, mg:39.2, cl:84.2, so4:49.1, f:0.7, no3:27.2, fe:0.1 },
  "Agara":               { ph:7.3, colour:1, turbidity:0.4, tds:270, alkalinity:175.6, th:102.1, ca:16.3, mg:14.9, cl:28.1, so4:7.1, f:0.4, no3:4.3, fe:0.19 },
  "Thataguni":           { ph:7.4, colour:1, turbidity:2.4, tds:340, alkalinity:133.8, th:142.9, ca:32.7, mg:14.9, cl:37.4, so4:19.2, f:0.4, no3:13.3, fe:0.25 },
  "Kumbalagodu":         { ph:8, colour:1, turbidity:4.1, tds:700, alkalinity:292.6, th:323.5, ca:95.9, mg:24.8, cl:93.6, so4:117.3, f:0.3, no3:32.9, fe:0.17 },
  "Vajarahalli":         { ph:7.5, colour:1, turbidity:3.2, tds:1000, alkalinity:259.2, th:505.2, ca:130.8, mg:44.6, cl:215.3, so4:89.8, f:0.8, no3:14.5, fe:0 },
  "Doddakannahalli":     { ph:7.9, colour:1, turbidity:3.2, tds:740, alkalinity:125.4, th:331.6, ca:85, mg:29.7, cl:243.3, so4:57.3, f:0.3, no3:19.8, fe:0.16 },
  "Rajanukunte":         { ph:7.6, colour:1, turbidity:4.2, tds:580, alkalinity:104.5, th:265.4, ca:68.7, mg:22.8, cl:153.5, so4:23.7, f:0.6, no3:38.4, fe:0.1 },
  "Yelahanka":           { ph:7.5, colour:1, turbidity:4.1, tds:600, alkalinity:133.8, th:265.4, ca:67, mg:19.8, cl:168.5, so4:23, f:0.8, no3:38.7, fe:0.2 },
  "Hessaragatha":        { ph:7.5, colour:1, turbidity:4, tds:440, alkalinity:209, th:222.4, ca:40.9, mg:29.7, cl:37.4, so4:16.8, f:0.8, no3:14.9, fe:0.1 },
  "Doddabyalakere":      { ph:7.6, colour:1, turbidity:4.8, tds:420, alkalinity:238.3, th:149.6, ca:32.7, mg:16.9, cl:50.5, so4:17.5, f:0.6, no3:25, fe:0.15 },
  "Kakolu":              { ph:8, colour:1, turbidity:4.4, tds:670, alkalinity:175.6, th:331.6, ca:85, mg:29.7, cl:88, so4:44.1, f:0.6, no3:39.5, fe:0.2 },
  "Sonappanahalli":      { ph:7.4, colour:1, turbidity:4.9, tds:140, alkalinity:29.3, th:40.4, ca:11.4, mg:3, cl:18.7, so4:4.6, f:0.7, no3:38.5, fe:0.11 },
  "Doddajala":           { ph:7.6, colour:1, turbidity:6.3, tds:600, alkalinity:238.3, th:465, ca:131.2, mg:32.5, cl:177.8, so4:65.2, f:0.6, no3:16.9, fe:0.1 },
  "Bagaluru":            { ph:7.9, colour:1, turbidity:4.1, tds:890, alkalinity:238.3, th:465, ca:134.1, mg:32.7, cl:177.8, so4:65.2, f:0.6, no3:16.9, fe:0.1 },
  "Mylapanahalli":       { ph:7.2, colour:1, turbidity:0.9, tds:280, alkalinity:112.9, th:141.5, ca:29.4, mg:16.9, cl:28.1, so4:7.3, f:0.6, no3:6.2, fe:0.1 },
};

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TALUKS = ["Anekal","Bengaluru North","Bengaluru South","Bengaluru East","Yelahanka"];
const TALUK_PALETTE: Record<string, string> = {
  "Anekal": "#0284c7", "Bengaluru North": "#10b981", "Bengaluru South": "#ec4899",
  "Bengaluru East": "#f59e0b", "Yelahanka": "#8b5cf6",
};

const LAT_MIN = 12.69, LAT_MAX = 13.21;
const LON_MIN = 77.4, LON_MAX = 77.82;
const GLOBAL_MAX = Math.max(...WELLS.flatMap(w => w.months.filter((v): v is number => v !== null)));

const BOUNDARY: [number, number][] = [
  [77.52,13.11],[77.55,13.19],[77.58,13.21],[77.6,13.19],[77.63,13.2],[77.66,13.15],
  [77.68,13.13],[77.73,13.12],[77.76,13.08],[77.74,13.04],[77.77,13.02],[77.75,12.98],
  [77.8,12.95],[77.78,12.92],[77.82,12.89],[77.8,12.85],[77.77,12.81],[77.79,12.77],
  [77.73,12.72],[77.68,12.7],[77.65,12.72],[77.62,12.69],[77.58,12.73],[77.55,12.71],
  [77.51,12.75],[77.48,12.73],[77.45,12.77],[77.47,12.82],[77.43,12.86],[77.45,12.91],
  [77.41,12.96],[77.44,13.02],[77.42,13.06],[77.47,13.09],
];

const INTERNAL_LINES: [number, number][][] = [
  [[77.49,13.08],[77.55,13.09],[77.6,13.11],[77.65,13.09],[77.72,13.12]],
  [[77.55,13.09],[77.56,13.0],[77.53,12.92],[77.58,12.87]],
  [[77.56,13.0],[77.65,12.98],[77.7,12.94],[77.78,12.94]],
  [[77.46,12.84],[77.53,12.85],[77.6,12.81],[77.68,12.83],[77.76,12.8]],
];

// BIS IS 10500:2012 safe limits
const SAFE_LIMITS: Record<string, { limit: number; unit: string }> = {
  ph: { limit: 8.5, unit: '' }, tds: { limit: 500, unit: 'mg/L' },
  th: { limit: 200, unit: 'mg/L' }, cl: { limit: 250, unit: 'mg/L' },
  no3: { limit: 45, unit: 'mg/L' }, f: { limit: 1, unit: 'mg/L' },
  fe: { limit: 0.3, unit: 'mg/L' }, so4: { limit: 200, unit: 'mg/L' },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function normLon(lon: number) { return (lon - LON_MIN) / (LON_MAX - LON_MIN); }
function normLat(lat: number) { return (lat - LAT_MIN) / (LAT_MAX - LAT_MIN); }
function depthColor(d: number | null) {
  if (d === null || d === 0) return "#475569";
  if (d < 15) return "#22c55e";
  if (d < 50) return "#f59e0b";
  return "#ef4444";
}
function shadeHex(hex: string, amt: number) {
  const c = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((c >> 16) & 0xff) + amt));
  const g = Math.min(255, Math.max(0, ((c >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (c & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

interface WellData {
  taluk: string; loc: string; lat: number; lon: number;
  months: (number | null)[];
}

// ─── ISOMETRIC CANVAS ────────────────────────────────────────────────────────
function IsometricCanvas({ monthIdx, colorMode, towerScale, activeTaluks, onWellClick }: {
  monthIdx: number; colorMode: string; towerScale: number;
  activeTaluks: string[]; onWellClick: (w: WellData | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<WellData | null>(null);
  const [ttPos, setTtPos] = useState({ x: 0, y: 0 });

  // Interactive View States
  const [rotation, setRotation] = useState(-0.6); // Angle in radians (about Z-axis)
  const [pitch, setPitch] = useState(0.65); // Tilt angle in radians (about X-axis)
  const [zoom, setZoom] = useState(1.0); // Map Zoom level
  const [autoRotate, setAutoRotate] = useState(true); // Toggle auto rotation

  // Dragging logic refs
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const rotationStartRef = useRef<number>(0);
  const pitchStartRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);

  // Wheel zoom handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Zoom factor: increment/decrement by scroll amount
      setZoom(prev => Math.max(0.4, Math.min(3.0, prev - e.deltaY * 0.001)));
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Auto rotation timer
  useEffect(() => {
    if (!autoRotate || isDragging) return;
    let animId: number;
    const tick = () => {
      setRotation(prev => (prev + 0.003) % (Math.PI * 2));
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [autoRotate, isDragging]);

  // Window mouse move/up listeners for smooth dragging outside canvas bounds
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (Math.hypot(dx, dy) > 4) {
        setHasDragged(true);
      }

      // X-drag rotates the map (yaw)
      setRotation(rotationStartRef.current - dx * 0.007);
      
      // Y-drag tilts the map (pitch)
      const newPitch = pitchStartRef.current - dy * 0.005;
      // Clamp pitch to avoid turning completely flat or flipping
      setPitch(Math.max(0.15, Math.min(1.4, newPitch)));
    };

    const handleMouseUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setIsDragging(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    rotationStartRef.current = rotation;
    pitchStartRef.current = pitch;
    setIsDragging(true);
    setHasDragged(false);
    setAutoRotate(false); // Pause auto-rotate when user manually interacts
  };

  // Main screen projection helper
  const getProjFunc = useCallback((W: number, H: number) => {
    const baseScale = Math.min(W, H) * 0.72;
    const scale = baseScale * zoom;
    const offX = W * 0.5;
    const offY = H * 0.48; // Centered vertically, slightly shifted for tower height clearance

    return (lon: number, lat: number, elevPx = 0) => {
      // 1. Center coordinates around 0 in range [-0.5, 0.5]
      const nx = normLon(lon) - 0.5;
      const ny = normLat(lat) - 0.5;

      // 2. Rotate around Z-axis (Yaw)
      const rx = nx * Math.cos(rotation) - ny * Math.sin(rotation);
      const ry = nx * Math.sin(rotation) + ny * Math.cos(rotation);

      // 3. Project with Pitch (X-tilt) and Elevation (which pulls points vertically up)
      const sx = rx * scale + offX;
      const sy = -ry * scale * Math.cos(pitch) + offY - elevPx;
      return { sx, sy };
    };
  }, [rotation, pitch, zoom]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const toScreen = getProjFunc(W, H);

    // Drop shadow
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    BOUNDARY.forEach(([lon, lat], i) => {
      const { sx, sy } = toScreen(lon, lat);
      // Offset drop shadow slightly down/right
      i === 0 ? ctx.moveTo(sx + 8, sy + 8) : ctx.lineTo(sx + 8, sy + 8);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Slab sides (extrusion Y-offset on screen)
    const SLAB_H = 12;
    for (let i = 0; i < BOUNDARY.length; i++) {
      const next = (i + 1) % BOUNDARY.length;
      const p0 = toScreen(BOUNDARY[i][0], BOUNDARY[i][1]);
      const p1 = toScreen(BOUNDARY[next][0], BOUNDARY[next][1]);
      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.lineTo(p1.sx, p1.sy + SLAB_H);
      ctx.lineTo(p0.sx, p0.sy + SLAB_H);
      ctx.closePath();

      // Shading based on normal angle / screen position relative to center
      const centerX = W * 0.5;
      const isWestSide = (p0.sx + p1.sx) / 2 < centerX;
      ctx.fillStyle = isWestSide ? "#8ba3b5" : "#6c8496";
      ctx.fill();
    }

    // Slab top
    ctx.beginPath();
    BOUNDARY.forEach(([lon, lat], i) => {
      const { sx, sy } = toScreen(lon, lat);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fillStyle = "#ebf1f5";
    ctx.fill();
    ctx.strokeStyle = "#9db1c2";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Taluk boundary lines
    INTERNAL_LINES.forEach(pts => {
      ctx.beginPath();
      pts.forEach(([lon, lat], i) => {
        const { sx, sy } = toScreen(lon, lat);
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      });
      ctx.strokeStyle = "rgba(125,148,168,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Towers: filter & sort back-to-front using Painter's Algorithm
    const filtered = WELLS.filter(w => activeTaluks.includes(w.taluk));
    
    // Sort descending by rotated Y-coordinate (further away / higher up on screen drawn first)
    const sorted = [...filtered].sort((a, b) => {
      const ay = normLat(a.lat) - 0.5;
      const ax = normLon(a.lon) - 0.5;
      const ary = ax * Math.sin(rotation) + ay * Math.cos(rotation);
      
      const by = normLat(b.lat) - 0.5;
      const bx = normLon(b.lon) - 0.5;
      const bry = bx * Math.sin(rotation) + by * Math.cos(rotation);
      
      return bry - ary; // larger ry = further away (drawn first)
    });

    sorted.forEach(w => {
      const depth = w.months[monthIdx];
      const { sx: bx, sy: by } = toScreen(w.lon, w.lat);
      const color = colorMode === "depth" ? depthColor(depth) : (TALUK_PALETTE[w.taluk] || "#888");
      
      // Calculate tower pixel height
      const pixH = depth !== null && depth > 0 ? (depth / GLOBAL_MAX) * 110 * towerScale : 4;
      const CW = 7; // Tower width
      const IX = 3;  // Isometric depth offset X
      const IY = -2; // Isometric depth offset Y
      const isHov = hovered === w;
      
      ctx.save();
      ctx.globalAlpha = isHov ? 1.0 : 0.88;

      // Draw 3D column
      // 1. Right face
      ctx.fillStyle = shadeHex(color, -25);
      ctx.beginPath();
      ctx.moveTo(bx + CW / 2, by);
      ctx.lineTo(bx + CW / 2 + IX, by + IY);
      ctx.lineTo(bx + CW / 2 + IX, by - pixH + IY);
      ctx.lineTo(bx + CW / 2, by - pixH);
      ctx.closePath();
      ctx.fill();

      // 2. Left face
      ctx.fillStyle = shadeHex(color, -45);
      ctx.beginPath();
      ctx.moveTo(bx - CW / 2, by);
      ctx.lineTo(bx - CW / 2, by - pixH);
      ctx.lineTo(bx - CW / 2 + IX, by - pixH + IY);
      ctx.lineTo(bx - CW / 2 + IX, by + IY);
      ctx.closePath();
      ctx.fill();

      // 3. Front face
      ctx.fillStyle = color;
      ctx.fillRect(bx - CW / 2, by - pixH, CW, pixH);

      // 4. Top face
      ctx.fillStyle = shadeHex(color, 20);
      ctx.beginPath();
      ctx.moveTo(bx - CW / 2, by - pixH);
      ctx.lineTo(bx - CW / 2 + IX, by - pixH + IY);
      ctx.lineTo(bx + CW / 2 + IX, by - pixH + IY);
      ctx.lineTo(bx + CW / 2, by - pixH);
      ctx.closePath();
      ctx.fill();

      // Highlight hover state
      if (isHov) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(bx, by, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - CW / 2, by - pixH, CW, pixH);
      }

      // Draw dot base
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Dynamic Taluk Labels (re-projected with rotation)
    const labels = [
      { text: "Anekal", lon: 77.68, lat: 12.8 },
      { text: "BLR North", lon: 77.52, lat: 13.08 },
      { text: "BLR South", lon: 77.54, lat: 12.92 },
      { text: "BLR East", lon: 77.72, lat: 12.96 },
      { text: "Yelahanka", lon: 77.58, lat: 13.14 },
    ];
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    labels.forEach(l => {
      const { sx, sy } = toScreen(l.lon, l.lat);
      ctx.fillStyle = "rgba(74,85,104,0.85)";
      ctx.fillText(l.text.toUpperCase(), sx, sy + 14);
    });

  }, [monthIdx, colorMode, towerScale, activeTaluks, hovered, getProjFunc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const ro = new ResizeObserver(() => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      draw();
    });
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    // If we're currently dragging the map, don't perform hover selection
    if (isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const toScreen = getProjFunc(canvas.width, canvas.height);

    let best: WellData | null = null;
    let bestD = 22; // Hover hit radius

    WELLS.forEach(w => {
      // Base coordinates
      const { sx, sy } = toScreen(w.lon, w.lat);
      const d = Math.hypot(mx - sx, my - sy);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    });

    setHovered(best);
    setTtPos({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 12 });
  }

  function handleClick() {
    // Only register click if we were not dragging the map
    if (!hasDragged && hovered) {
      onWellClick(hovered);
    }
  }

  const h = hovered;
  const depth = h ? h.months[monthIdx] : null;
  const validM = h ? h.months.filter((v): v is number => v !== null) : [];
  const annAvg = validM.length ? validM.reduce((a, b) => a + b, 0) / validM.length : 0;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={handleClick}
      />
      
      {/* Dynamic Overlay Controls */}
      <div className="gw-overlay-controls">
        <button
          className={`gw-overlay-btn ${autoRotate ? 'gw-overlay-btn--active' : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
          title={autoRotate ? "Pause Auto-Rotation" : "Start Auto-Rotation"}
        >
          {autoRotate ? "⏸️" : "🔄"}
        </button>
        <button
          className="gw-overlay-btn"
          onClick={() => {
            setRotation(-0.6);
            setPitch(0.65);
            setZoom(1.0);
            setAutoRotate(false);
          }}
          title="Reset View"
        >
          ⟲
        </button>
        <div className="gw-zoom-indicator">Zoom: {Math.round(zoom * 100)}%</div>
      </div>
      
      {/* Drag Hint overlay */}
      <div className="gw-drag-hint">
        🖱️ Drag to Rotate/Tilt | Scroll to Zoom
      </div>

      {h && (
        <div className="gw-tooltip" style={{ left: ttPos.x, top: ttPos.y }}>
          <div className="gw-tooltip__name">{h.loc}</div>
          <div className="gw-tooltip__taluk">{h.taluk}</div>
          <div className="gw-tooltip__row"><span>Depth ({MONTHS[monthIdx]})</span><span>{depth !== null && depth > 0 ? depth.toFixed(1) + " mbgl" : "DRY"}</span></div>
          <div className="gw-tooltip__row"><span>Annual avg</span><span>{annAvg.toFixed(1)} mbgl</span></div>
          <div className="gw-tooltip__hint">Click for water quality →</div>
        </div>
      )}
    </div>
  );
}

// ─── TREND CHART ─────────────────────────────────────────────────────────────
function TrendChart({ monthIdx, activeTaluks }: { monthIdx: number; activeTaluks: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const PL = 36, PR = 10, PT = 6, PB = 22, cW = W - PL - PR, cH = H - PT - PB;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(30,40,60,0.8)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) { const y = PT + cH - (i / 4) * cH; ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + cW, y); ctx.stroke(); }

    const allVals: number[] = [];
    const data: Record<string, (number | null)[]> = {};
    TALUKS.filter(t => activeTaluks.includes(t)).forEach(t => {
      const avgs = MONTHS.map((_, mi) => {
        const vals = WELLS.filter(w => w.taluk === t).map(w => w.months[mi]).filter((v): v is number => v !== null && v > 0);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      });
      data[t] = avgs; avgs.forEach(v => { if (v !== null) allVals.push(v); });
    });
    const maxV = Math.max(...allVals) || 1;

    Object.entries(data).forEach(([t, avgs]) => {
      const color = TALUK_PALETTE[t]; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); let started = false;
      avgs.forEach((v, i) => { if (v === null) return; const x = PL + (i / (MONTHS.length - 1)) * cW; const y = PT + cH - (v / maxV) * cH; if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); });
      ctx.stroke();
      avgs.forEach((v, i) => { if (v === null) return; const x = PL + (i / (MONTHS.length - 1)) * cW; const y = PT + cH - (v / maxV) * cH; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); });
    });

    const mx = PL + (monthIdx / (MONTHS.length - 1)) * cW;
    ctx.strokeStyle = "rgba(56,189,248,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(mx, PT); ctx.lineTo(mx, PT + cH); ctx.stroke(); ctx.setLineDash([]);

    ctx.font = "8px monospace"; ctx.fillStyle = "#4a6080"; ctx.textAlign = "center";
    MONTHS.forEach((m, i) => ctx.fillText(m, PL + (i / (MONTHS.length - 1)) * cW, H - 4));
  }, [monthIdx, activeTaluks]);

  return <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}

// ─── WATER QUALITY DETAIL PANEL ──────────────────────────────────────────────
function WaterQualityPanel({ well, onClose }: { well: WellData; onClose: () => void }) {
  const wq = WATER_QUALITY[well.loc];
  const validMonths = well.months.filter((v): v is number => v !== null);
  const avg = validMonths.length ? validMonths.reduce((a, b) => a + b, 0) / validMonths.length : 0;
  const min = validMonths.length ? Math.min(...validMonths) : 0;
  const max = validMonths.length ? Math.max(...validMonths) : 0;

  const qParams = wq ? [
    { key: 'ph', label: 'pH', val: wq.ph },
    { key: 'tds', label: 'TDS', val: wq.tds },
    { key: 'th', label: 'Total Hardness', val: wq.th },
    { key: 'cl', label: 'Chloride', val: wq.cl },
    { key: 'no3', label: 'Nitrate (NO₃)', val: wq.no3 },
    { key: 'f', label: 'Fluoride', val: wq.f },
    { key: 'fe', label: 'Iron (Fe)', val: wq.fe },
    { key: 'so4', label: 'Sulphate (SO₄)', val: wq.so4 },
  ] : [];

  return (
    <div className="gw-detail-panel glass-card">
      <div className="gw-detail-panel__header">
        <div>
          <h3 className="gw-detail-panel__name">{well.loc}</h3>
          <span className="gw-detail-panel__taluk">{well.taluk} · {well.lat.toFixed(4)}, {well.lon.toFixed(4)}</span>
        </div>
        <button className="gw-detail-panel__close" onClick={onClose}>✕</button>
      </div>

      <div className="gw-detail-panel__stats">
        <div className="gw-detail-stat">
          <span className="gw-detail-stat__val">{avg.toFixed(1)}</span>
          <span className="gw-detail-stat__label">Avg Depth (m)</span>
        </div>
        <div className="gw-detail-stat">
          <span className="gw-detail-stat__val">{min.toFixed(1)}</span>
          <span className="gw-detail-stat__label">Shallowest (m)</span>
        </div>
        <div className="gw-detail-stat">
          <span className="gw-detail-stat__val">{max.toFixed(1)}</span>
          <span className="gw-detail-stat__label">Deepest (m)</span>
        </div>
      </div>

      {/* Monthly depth sparkline */}
      <div className="gw-sparkline">
        <div className="gw-sparkline__title">📉 Monthly Depth Trend (mbgl)</div>
        <div className="gw-sparkline__bars">
          {well.months.map((v, i) => {
            const h = v !== null ? (v / GLOBAL_MAX) * 100 : 0;
            return (
              <div key={i} className="gw-sparkline__col">
                <div className="gw-sparkline__bar" style={{ height: `${h}%`, background: depthColor(v) }} title={v !== null ? `${v.toFixed(1)} mbgl` : 'No data'} />
                <span className="gw-sparkline__month">{MONTHS[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Water Quality */}
      {wq ? (
        <div className="gw-quality">
          <div className="gw-quality__title">🧪 Water Quality (BIS IS 10500:2012)</div>
          <div className="gw-quality__grid">
            {qParams.map(p => {
              const limit = SAFE_LIMITS[p.key];
              const exceeded = limit && p.val > limit.limit;
              return (
                <div key={p.key} className={`gw-quality__item ${exceeded ? 'gw-quality__item--danger' : 'gw-quality__item--safe'}`}>
                  <div className="gw-quality__item-header">
                    <span className="gw-quality__item-label">{p.label}</span>
                    <span className={`gw-quality__item-status ${exceeded ? 'text-high' : 'text-low'}`}>{exceeded ? '⚠ Exceeds' : '✓ Safe'}</span>
                  </div>
                  <div className="gw-quality__item-val">{p.val} {limit?.unit}</div>
                  {limit && <div className="gw-quality__item-limit">Limit: {limit.limit} {limit.unit}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="gw-quality__none">No water quality data available for this location.</div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
function GroundwaterMap() {
  const [monthIdx, setMonthIdx] = useState(0);
  const [colorMode, setColorMode] = useState("depth");
  const [towerScale, setTowerScale] = useState(1.0);
  const [activeTaluks, setActiveTaluks] = useState([...TALUKS]);
  const [selectedWell, setSelectedWell] = useState<WellData | null>(null);

  const filtered = WELLS.filter(w => activeTaluks.includes(w.taluk));
  const depths = filtered.map(w => w.months[monthIdx]);
  const valid = depths.filter((d): d is number => d !== null && d > 0);
  const dry = depths.filter(d => d === null || d === 0).length;
  const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
  const max = valid.length ? Math.max(...valid) : 0;
  const maxW = filtered.find(w => w.months[monthIdx] === max)?.loc || "—";

  function toggleTaluk(t: string) {
    setActiveTaluks(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  return (
    <div className="gw-view">
      <div className="page-header">
        <h1 className="page-title">3D Groundwater Map</h1>
        <p className="page-subtitle">Borewell observation data — Bengaluru Urban District 2024 · Click a tower for water quality</p>
      </div>

      {/* Stats bar */}
      <div className="gw-stats-bar">
        <div className="gw-stats-badge">{MONTHS[monthIdx]} 2024</div>
        <div className="gw-stat-card"><span className="gw-stat-card__val">{avg.toFixed(1)} m</span><span className="gw-stat-card__label">Avg Depth</span></div>
        <div className="gw-stat-card"><span className="gw-stat-card__val">{max.toFixed(1)} m</span><span className="gw-stat-card__label">Deepest</span></div>
        <div className="gw-stat-card"><span className="gw-stat-card__val gw-stat-card__val--loc">{maxW}</span><span className="gw-stat-card__label">Deepest Loc</span></div>
        <div className="gw-stat-card"><span className="gw-stat-card__val" style={{color:'var(--risk-high)'}}>{dry}</span><span className="gw-stat-card__label">Dry / No Data</span></div>
      </div>

      {/* Controls */}
      <div className="gw-controls">
        <div className="gw-controls__section">
          <span className="gw-controls__label">Month</span>
          <div className="gw-month-grid">
            {MONTHS.map((m, i) => (
              <button key={m} className={`gw-month-btn ${monthIdx === i ? 'gw-month-btn--active' : ''}`} onClick={() => setMonthIdx(i)}>{m}</button>
            ))}
          </div>
        </div>
        <div className="gw-controls__section">
          <span className="gw-controls__label">Colour</span>
          <div className="gw-radio-group">
            {[["depth","Depth"],["taluk","Zone"]].map(([val,label]) => (
              <button key={val} className={`gw-radio ${colorMode === val ? 'gw-radio--active' : ''}`} onClick={() => setColorMode(val)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="gw-controls__section">
          <span className="gw-controls__label">Scale {towerScale.toFixed(1)}×</span>
          <input type="range" min="0.3" max="2.5" step="0.1" value={towerScale} onChange={e => setTowerScale(parseFloat(e.target.value))} className="gw-slider" />
        </div>
        <div className="gw-controls__section">
          <span className="gw-controls__label">Zones</span>
          <div className="gw-zone-chips">
            {TALUKS.map(t => (
              <button key={t} className={`gw-zone-chip ${activeTaluks.includes(t) ? 'gw-zone-chip--active' : ''}`}
                style={{ '--chip-color': TALUK_PALETTE[t] } as React.CSSProperties} onClick={() => toggleTaluk(t)}>
                {t.replace("Bengaluru ","BLR ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="gw-main-layout">
        {/* Map */}
        <div className="gw-map-container glass-card" style={{ padding: 0 }}>
          <IsometricCanvas monthIdx={monthIdx} colorMode={colorMode} towerScale={towerScale} activeTaluks={activeTaluks} onWellClick={setSelectedWell} />
          {/* Legend */}
          <div className="gw-legend">
            {colorMode === "depth" ? (
              [["#22c55e","< 15m"],["#f59e0b","15–50m"],["#ef4444","> 50m"],["#475569","Dry"]].map(([c,l]) => (
                <div key={l} className="gw-legend__item"><span className="gw-legend__dot" style={{background:c}} />{l}</div>
              ))
            ) : (
              Object.entries(TALUK_PALETTE).map(([t,c]) => (
                <div key={t} className="gw-legend__item"><span className="gw-legend__dot" style={{background:c}} />{t.replace("Bengaluru ","BLR ")}</div>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedWell && <WaterQualityPanel well={selectedWell} onClose={() => setSelectedWell(null)} />}
      </div>

      {/* Trend chart */}
      <div className="gw-trend glass-card">
        <div className="gw-trend__title">📈 Annual depth trend by zone (avg mbgl)</div>
        <div className="gw-trend__chart"><TrendChart monthIdx={monthIdx} activeTaluks={activeTaluks} /></div>
        <div className="gw-trend__legend">
          {TALUKS.filter(t => activeTaluks.includes(t)).map(t => (
            <span key={t} className="gw-trend__legend-item"><span style={{background:TALUK_PALETTE[t]}} className="gw-legend__dot" />{t.replace("Bengaluru ","BLR ")}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GroundwaterMap;
