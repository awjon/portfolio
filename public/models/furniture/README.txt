Kenney Furniture Kit (CC0) goes here — https://kenney.nl/assets/furniture-kit

The house engine (src/world/) references these files via the asset registry in
src/world/HouseAssets.ts. Furniture renders as the real GLB (falling back to a
coloured box if a file is missing).

The shell is EDGE-based, the way Kenney designed it: wall panels sit on cell
boundaries and corner caps at the junctions, so rooms sit directly against each
other and furniture can hug a wall. HouseRenderer fits each piece to the tile
size at load (measuring its bbox), so the exact native dimensions don't matter.

Expected filenames (edit HouseAssets.ts if your extract differs — that registry
is the ONLY place paths live):

  Shell (walls on edges, corners at L-junctions)
    floorFull.glb           floor
    wall.glb                straight wall panel (per edge)
    wallCorner.glb          corner cap (at L-junction vertices)
    wallDoorwayWide.glb     door (passable opening on an interior edge)
    wallWindowSlide.glb     window (exterior edge)

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
