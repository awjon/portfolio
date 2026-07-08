Kenney Furniture Kit (CC0) goes here — https://kenney.nl/assets/furniture-kit

The house engine (src/world/) references these files via the asset registry in
src/world/HouseAssets.ts. Furniture renders as the real GLB (falling back to a
coloured box if a file is missing).

Note on the shell: the Kenney wall pieces are EDGE-based (1u panels, 0.55u corner
caps) and don't fill a cell grid, so HouseRenderer draws the walls / doors /
windows procedurally to guarantee seamless tiling. The wall GLBs below stay in
the registry so you can switch AssetModel back to them and calibrate if you want
the exact Kenney look.

Expected filenames (edit HouseAssets.ts if your extract differs — that registry
is the ONLY place paths live):

  Shell (present, but currently drawn procedurally — see note above)
    floorFull.glb           floor
    wall.glb                straight wall (also reused for end/post)
    wallCorner.glb          corner (T-junction = corner+wall, cross = 2 corners)
    wallDoorwayWide.glb     door
    wallWindowSlide.glb     window

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
