Kenney Furniture Kit (CC0) goes here — https://kenney.nl/assets/furniture-kit

The house (src/world/) uses these files directly: HouseShell.tsx builds the
shell and HouseProps.tsx the furniture, both by path.

The shell is EDGE-based, the way Kenney designed it: wall panels sit on cell
boundaries, so rooms sit directly against each other and furniture can hug a
wall. The kit is authored at 1 unit per tile, so HouseMap.TILE doubles as the
kit's scale — change it and the whole building rescales consistently.

Shell pieces used (see HouseShell.tsx):
    floorFull.glb           floor tile, one per cell
    wall.glb                straight wall panel (per boundary edge)
    wallDoorwayWide.glb     doorway (a ~1.3-unit-wide walk-through opening)
    wallWindow.glb          window (exterior edges, on a fixed rhythm)
    doorwayFront.glb        the front door, standing open on the porch

  Living room / general
    loungeDesignSofa.glb    sofa
    tableCoffee.glb         coffee table
    rugRectangle.glb        rug
    lampRoundFloor.glb      lamp
    televisionModern.glb    tv
    pottedPlant.glb         plant
    tableCloth.glb          table
    chairCushion.glb        chair
    bookcaseClosed.glb      bookshelf
    desk.glb                desk

  Bedroom
    bedDouble.glb           bed
    cabinetBedDrawer.glb    nightstand
    sideTableDrawers.glb    dresser

  Kitchen
    kitchenFridge.glb       refrigerator
    kitchenMicrowave.glb    microwave
    kitchenBlender.glb      fruit bowl (kit has no bowl)
    toaster.glb             toaster
    kitchenCabinetUpper.glb cabinet

  Bathroom
    toilet.glb              toilet
    bathtub.glb             bathtub
    bathroomSink.glb        sink

Keep each GLB beside its Textures/ folder if the kit uses external textures, so
the relative colormap references resolve. Run `npm run compress` after adding.
