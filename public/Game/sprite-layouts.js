// Per-column row boundaries in SOURCE IMAGE pixels, measured from the sheet top.
// The imported rows are uneven: equal-height slicing cuts hair, feet, and halos.
// Each column has nine edges defining eight rows. Adjust an edge up/down to
// move the shared boundary between two rows; keep values in increasing order.
// Change columnEdges if horizontal frame cropping needs adjustment.
// Arona has a large left margin and narrower columns; its layout is independent.
// Optional footY values anchor visible feet instead of transparent crop bottoms.
// Optional frames[row][column] overrides handle attack effects outside grid cells.
// anchorX is a SOURCE IMAGE coordinate: keep it on the tank, not the flash/flag.
// Packed right-cannon frames must stay inside their column to prevent neighbor bleed.
// Right-firing crops are shifted +18 source pixels; anchorX stays fixed.
export const spriteLayouts = {
  "plana": {
    "columnEdges": [
      0,
      198,
      397,
      595,
      794,
      992
    ],
    "rowEdges": [
      [
        0,
        198,
        392,
        589,
        786,
        991,
        1185,
        1378,
        1586
      ],
      [
        0,
        198,
        392,
        588,
        787,
        991,
        1185,
        1377,
        1586
      ],
      [
        0,
        198,
        395,
        588,
        788,
        991,
        1187,
        1378,
        1586
      ],
      [
        0,
        198,
        396,
        592,
        788,
        991,
        1187,
        1378,
        1586
      ],
      [
        0,
        198,
        396,
        592,
        789,
        991,
        1186,
        1377,
        1586
      ]
    ]
  },
  "mob": {
    "columnEdges": [
      0,
      198,
      397,
      595,
      794,
      992
    ],
    "rowEdges": [
      [
        0,
        201,
        396,
        589,
        793,
        987,
        1187,
        1377,
        1586
      ],
      [
        0,
        198,
        396,
        588,
        793,
        988,
        1186,
        1378,
        1586
      ],
      [
        0,
        201,
        397,
        588,
        793,
        989,
        1185,
        1375,
        1586
      ],
      [
        0,
        201,
        396,
        589,
        793,
        991,
        1188,
        1376,
        1586
      ],
      [
        0,
        201,
        396,
        590,
        793,
        990,
        1186,
        1375,
        1586
      ]
    ]
  },
  "arona": {
    "columnEdges": [
      160,
      320,
      480,
      640,
      800,
      960
    ],
    "rowEdges": [
      [
        0,
        177,
        349,
        523,
        701,
        876,
        1053,
        1237,
        1448
      ],
      [
        0,
        177,
        349,
        523,
        701,
        876,
        1053,
        1237,
        1448
      ],
      [
        0,
        177,
        349,
        523,
        701,
        876,
        1053,
        1237,
        1448
      ],
      [
        0,
        177,
        349,
        523,
        702,
        876,
        1053,
        1237,
        1448
      ],
      [
        0,
        177,
        348,
        523,
        699,
        876,
        1053,
        1237,
        1448
      ]
    ],
    "footY": [
      [
        173,
        347,
        519,
        695,
        872,
        1050,
        1230,
        1416
      ],
      [
        173,
        347,
        519,
        695,
        873,
        1050,
        1231,
        1416
      ],
      [
        173,
        346,
        519,
        695,
        872,
        1050,
        1230,
        1416
      ],
      [
        173,
        347,
        520,
        695,
        873,
        1050,
        1230,
        1416
      ],
      [
        173,
        347,
        519,
        695,
        873,
        1049,
        1230,
        1416
      ]
    ]
  },
  "iroha": {
    "columnEdges": [
      0,
      181,
      362,
      543,
      724,
      905,
      1086,
      1267,
      1448
    ],
    "rowEdges": [
      [
        0,
        185,
        355,
        530,
        690,
        875,
        1086
      ],
      [
        0,
        185,
        355,
        530,
        690,
        875,
        1086
      ],
      [
        0,
        185,
        355,
        530,
        690,
        875,
        1086
      ],
      [
        0,
        185,
        355,
        530,
        690,
        875,
        1086
      ],
      [
        0,
        185,
        355,
        530,
        690,
        875,
        1086
      ],
      [
        0,
        185,
        355,
        530,
        690,
        875,
        1086
      ],
      [
        0,
        185,
        355,
        530,
        690,
        875,
        1086
      ],
      [
        0,
        185,
        355,
        530,
        690,
        875,
        1086
      ]
    ],
    "footY": [
      [
        162,
        330,
        502,
        671,
        855,
        1047
      ],
      [
        162,
        330,
        502,
        671,
        855,
        1047
      ],
      [
        162,
        330,
        502,
        671,
        855,
        1047
      ],
      [
        162,
        330,
        502,
        671,
        855,
        1047
      ],
      [
        162,
        330,
        502,
        671,
        855,
        1047
      ],
      [
        162,
        330,
        502,
        671,
        855,
        1047
      ],
      [
        162,
        330,
        502,
        671,
        855,
        1047
      ],
      [
        162,
        330,
        502,
        671,
        855,
        1047
      ]
    ],
    "frames": [
      [
        {
          "x": 0,
          "y": 0,
          "width": 181,
          "height": 185,
          "footY": 162,
          "anchorX": 90.5
        },
        {
          "x": 181,
          "y": 0,
          "width": 181,
          "height": 185,
          "footY": 162,
          "anchorX": 271.5
        },
        {
          "x": 362,
          "y": 0,
          "width": 181,
          "height": 185,
          "footY": 162,
          "anchorX": 452.5
        },
        {
          "x": 543,
          "y": 0,
          "width": 181,
          "height": 185,
          "footY": 162,
          "anchorX": 633.5
        },
        {
          "x": 724,
          "y": 0,
          "width": 181,
          "height": 185,
          "footY": 162,
          "anchorX": 814.5
        },
        {
          "x": 905,
          "y": 0,
          "width": 181,
          "height": 185,
          "footY": 162,
          "anchorX": 995.5
        },
        {
          "x": 1086,
          "y": 0,
          "width": 181,
          "height": 185,
          "footY": 162,
          "anchorX": 1176.5
        },
        {
          "x": 1267,
          "y": 0,
          "width": 181,
          "height": 185,
          "footY": 162,
          "anchorX": 1357.5
        }
      ],
      [
        {
          "x": 0,
          "y": 185,
          "width": 181,
          "height": 170,
          "footY": 330,
          "anchorX": 90.5
        },
        {
          "x": 181,
          "y": 185,
          "width": 181,
          "height": 170,
          "footY": 330,
          "anchorX": 271.5
        },
        {
          "x": 362,
          "y": 185,
          "width": 181,
          "height": 170,
          "footY": 330,
          "anchorX": 452.5
        },
        {
          "x": 543,
          "y": 185,
          "width": 181,
          "height": 170,
          "footY": 330,
          "anchorX": 633.5
        },
        {
          "x": 724,
          "y": 185,
          "width": 181,
          "height": 170,
          "footY": 330,
          "anchorX": 814.5
        },
        {
          "x": 905,
          "y": 185,
          "width": 181,
          "height": 170,
          "footY": 330,
          "anchorX": 995.5
        },
        {
          "x": 1086,
          "y": 185,
          "width": 181,
          "height": 170,
          "footY": 330,
          "anchorX": 1176.5
        },
        {
          "x": 1267,
          "y": 185,
          "width": 181,
          "height": 170,
          "footY": 330,
          "anchorX": 1357.5
        }
      ],
      [
        {
          "x": 0,
          "y": 355,
          "width": 181,
          "height": 175,
          "footY": 502,
          "anchorX": 90.5
        },
        {
          "x": 181,
          "y": 355,
          "width": 181,
          "height": 175,
          "footY": 502,
          "anchorX": 271.5
        },
        {
          "x": 362,
          "y": 355,
          "width": 181,
          "height": 175,
          "footY": 502,
          "anchorX": 452.5
        },
        {
          "x": 543,
          "y": 355,
          "width": 181,
          "height": 175,
          "footY": 502,
          "anchorX": 633.5
        },
        {
          "x": 724,
          "y": 355,
          "width": 181,
          "height": 175,
          "footY": 502,
          "anchorX": 814.5
        },
        {
          "x": 905,
          "y": 355,
          "width": 181,
          "height": 175,
          "footY": 502,
          "anchorX": 995.5
        },
        {
          "x": 1086,
          "y": 355,
          "width": 181,
          "height": 175,
          "footY": 502,
          "anchorX": 1176.5
        },
        {
          "x": 1267,
          "y": 355,
          "width": 181,
          "height": 175,
          "footY": 502,
          "anchorX": 1357.5
        }
      ],
      [
        {
          "x": 18,
          "y": 530,
          "width": 181,
          "height": 160,
          "footY": 671,
          "anchorX": 90.5
        },
        {
          "x": 199,
          "y": 530,
          "width": 181,
          "height": 160,
          "footY": 671,
          "anchorX": 271.5
        },
        {
          "x": 380,
          "y": 530,
          "width": 181,
          "height": 160,
          "footY": 671,
          "anchorX": 452.5
        },
        {
          "x": 561,
          "y": 530,
          "width": 181,
          "height": 160,
          "footY": 671,
          "anchorX": 633.5
        },
        {
          "x": 742,
          "y": 530,
          "width": 181,
          "height": 160,
          "footY": 671,
          "anchorX": 814.5
        },
        {
          "x": 923,
          "y": 530,
          "width": 181,
          "height": 160,
          "footY": 671,
          "anchorX": 995.5
        },
        {
          "x": 1104,
          "y": 530,
          "width": 181,
          "height": 160,
          "footY": 671,
          "anchorX": 1176.5
        },
        {
          "x": 1285,
          "y": 530,
          "width": 163,
          "height": 160,
          "footY": 671,
          "anchorX": 1357.5
        }
      ],
      [
        {
          "x": 0,
          "y": 690,
          "width": 181,
          "height": 185,
          "footY": 855,
          "anchorX": 90.5
        },
        {
          "x": 181,
          "y": 690,
          "width": 181,
          "height": 185,
          "footY": 855,
          "anchorX": 271.5
        },
        {
          "x": 362,
          "y": 690,
          "width": 181,
          "height": 185,
          "footY": 855,
          "anchorX": 452.5
        },
        {
          "x": 543,
          "y": 690,
          "width": 181,
          "height": 185,
          "footY": 855,
          "anchorX": 633.5
        },
        {
          "x": 724,
          "y": 690,
          "width": 181,
          "height": 185,
          "footY": 855,
          "anchorX": 814.5
        },
        {
          "x": 905,
          "y": 690,
          "width": 181,
          "height": 185,
          "footY": 855,
          "anchorX": 995.5
        },
        {
          "x": 1086,
          "y": 690,
          "width": 181,
          "height": 185,
          "footY": 855,
          "anchorX": 1176.5
        },
        {
          "x": 1267,
          "y": 690,
          "width": 181,
          "height": 185,
          "footY": 855,
          "anchorX": 1357.5
        }
      ],
      [
        {
          "x": 0,
          "y": 875,
          "width": 181,
          "height": 211,
          "footY": 1047,
          "anchorX": 90.5
        },
        {
          "x": 181,
          "y": 875,
          "width": 181,
          "height": 211,
          "footY": 1047,
          "anchorX": 271.5
        },
        {
          "x": 362,
          "y": 875,
          "width": 181,
          "height": 211,
          "footY": 1047,
          "anchorX": 452.5
        },
        {
          "x": 543,
          "y": 875,
          "width": 181,
          "height": 211,
          "footY": 1047,
          "anchorX": 633.5
        },
        {
          "x": 724,
          "y": 875,
          "width": 181,
          "height": 211,
          "footY": 1047,
          "anchorX": 814.5
        },
        {
          "x": 905,
          "y": 875,
          "width": 181,
          "height": 211,
          "footY": 1047,
          "anchorX": 995.5
        },
        {
          "x": 1086,
          "y": 875,
          "width": 181,
          "height": 211,
          "footY": 1047,
          "anchorX": 1176.5
        },
        {
          "x": 1267,
          "y": 875,
          "width": 181,
          "height": 211,
          "footY": 1047,
          "anchorX": 1357.5
        }
      ]
    ]
  }
};
