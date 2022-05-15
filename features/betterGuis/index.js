/// <reference types="../../../CTAutocomplete" />
/// <reference lib="es2015" />
import Feature from "../../featureClass/class";
import logger from "../../logger";
import { f } from "../../../mappings/mappings";
import ToggleSetting from "../settings/settingThings/toggle";
import MuseumGui from "./museumGui.js";
import DungeonReadyGui from "./dungeonReadyGui";
import { SoopyGui } from "../../../guimanager";
import TextBox from "../../../guimanager/GuiElement/TextBox";

class BetterGuis extends Feature {
    constructor() {
        super()
    }

    onEnable() {
        this.initVariables()

        this.museumGui = new MuseumGui()
        this.dungeonReady = new DungeonReadyGui()

        this.replaceSbMenuClicks = new ToggleSetting("Improve Clicks on SBMENU", "This will change clicks to middle clicks, AND use commands where possible (eg /pets)", true, "sbmenu_clicks", this)
        this.reliableSbMenuClicks = { getValue: () => false }//removed because hypixel fixed, code kept incase hypixel adds back bug later //new ToggleSetting("Make SBMENU clicks reliable", "This will delay clicks on sbmenu to time them so they dont get canceled", true, "sbmenu_time", this)

        this.museumGuiEnabled = new ToggleSetting("Custom Museum GUI", "Custom gui for the Museum", true, "custom_museum_enabled", this)
        this.dungeonReadyGuiEnabled = new ToggleSetting("Custom Dungeon Ready GUI (UNFINISHED)", "Custom gui for the dungeon ready up menu", false, "custom_dungeon_ready_enabled", this)

        this.chestSearchBar = new ToggleSetting("Inventory Search Bar", "u can use '&' to make it filter buy stuff that contains multiple things", false, "inv_search", this)

        this.lastWindowId = 0
        this.shouldHold = 10
        this.clickSlot = -1
        this.clickSlotTime = 0

        this.middleClickGuis = [
            "Your SkyBlock Profile",
            "Your Skills",
            "Farming Skill",
            "Mining Skill",
            "Heart of the Mountain",
            "Combat Skill",
            "Foraging Skill",
            "Fishing Skill",
            "Enchanting Skill",
            "Alchemy Skill",
            "Carpentry Skill",
            "Runecrafting Skill",
            "Social Skill",
            "Taming Skill",
            "Dungeoneering",
            "Your Essence",
            "Healer Class Perks",
            "Mage Class Perks",
            "Beserk Class Perks",
            "Archer Class Perks",
            "Tank Class Perks",
            "Recipe Book",
            "Trades",
            "Quest Log",
            "Quest Log (Completed)",
            "Fairt Souls Guide",
            "Dungeon Journals",
            "Calendar and Events",
            "Booster Cookie",
            "Island Management",
            "Toggle Potion Effects",
            "Bank",
            "Bank Account Upgrades",
            "Co-op Bank Account",
            "Bank Deposit",
            "Bank Withdrawal",
            "Personal Bank Account",
            "Bazaar Orders",
            "Co-op Bazaar Orders",
            "Pets"
        ]
        this.middleClickStartsWith = [
            "Bestiary",
            "Private Island",
            "Hub",
            "Spiders Den",
            "Blazing Fortress",
            "The End",
            "Deep Caverns",
            "The Park",
            "Spooky Festival",
            "Catacombs",
            "The Catacombs",
            "Settings",
            "Bazaar",
            "Farming",
            "Mining",
            "Woods & Fishes",
            "Oddities"
        ]
        this.middleClickEndsWith = [
            "Recipe",
            "Recipes",
            ") Pets",
            "Collection",
            "Active Effects"
        ]

        this.registerChat("&r&aDungeon starts in 1 second.&r", () => {
            this.dungeonReady.readyInOneSecond.call(this.dungeonReady)
        })
        this.registerChat("&r&aDungeon starts in 1 second. Get ready!&r", () => {
            this.dungeonReady.readyInOneSecond.call(this.dungeonReady)
        })
        this.registerEvent("guiMouseClick", this.guiClicked)
        this.registerEvent("guiOpened", (event) => {
            if (this.museumGuiEnabled.getValue()) this.museumGui.guiOpened.call(this.museumGui, event)
            if (this.dungeonReadyGuiEnabled.getValue()) this.dungeonReady.guiOpened.call(this.dungeonReady, event)
        })
        this.registerEvent("worldLoad", () => {
            this.dungeonReady.reset()
        })
        this.registerChat("&e${*} &r&cThe Catacombs &r&ewith &r&9${players}/5 players &r&eon &r${*}&r", (players) => {
            if (this.dungeonReadyGuiEnabled.getValue()) this.dungeonReady.joinedDungeon.call(this.dungeonReady, ~~players)
        })
        this.registerChat("&eSkyBlock Dungeon Warp &r&7(${players} players)&r", (players) => {
            if (this.dungeonReadyGuiEnabled.getValue()) this.dungeonReady.joinedDungeon.call(this.dungeonReady, ~~players)
        })
        this.registerStep(true, 10, this.step)
        this.registerEvent("worldUnload", () => { this.museumGui.saveMuseumCache.call(this.museumGui) })
        this.registerStep(false, 30, () => { this.museumGui.saveMuseumCache.call(this.museumGui) })


        this.invSearchSoopyGui = new SoopyGui()
        this.invSearchSoopyGui._renderBackground = () => { }

        this.invSearchTextBox = new TextBox().setPlaceholder("Click to search").setLocation(0.4, 0.05, 0.2, 0.05)
        this.invSearchSoopyGui.element.addChild(this.invSearchTextBox)

        this.slotMatches = new Map()

        this.registerEvent("guiRender", this.postGuiRender).registeredWhen(() => this.chestSearchBar.getValue())
        this.registerEvent("guiMouseClick", this.guiMouseClick).registeredWhen(() => this.chestSearchBar.getValue())
        this.registerEvent("guiKey", this.guiKey).registeredWhen(() => this.chestSearchBar.getValue())
        this.registerEvent("renderSlot", this.renderSlot).registeredWhen(() => this.chestSearchBar.getValue())
        this.registerEvent("guiOpened", this.guiOpened).registeredWhen(() => this.chestSearchBar.getValue())
    }

    postGuiRender(x, y, gui) {
        if (gui.class.toString() !== "class net.minecraft.client.gui.inventory.GuiChest") return

        this.invSearchSoopyGui._render(x, y, 0)
    }
    guiMouseClick(x, y, button, gui) {
        if (gui.class.toString() !== "class net.minecraft.client.gui.inventory.GuiChest") return

        this.invSearchSoopyGui._onClick(x, y, button)
    }
    guiKey(char, code, gui, event) {
        if (gui.class.toString() !== "class net.minecraft.client.gui.inventory.GuiChest") return

        this.invSearchSoopyGui._onKeyPress(char, code)

        if (this.invSearchTextBox.text.selected) {
            cancel(event)
            this.slotMatches.clear()
        }
    }
    guiOpened() {
        this.slotMatches.clear()
    }

    renderSlot(slot, gui, event) {
        if (gui.class.toString() !== "class net.minecraft.client.gui.inventory.GuiChest") return
        if (!this.invSearchTextBox.getText()) return

        let searchText = this.invSearchTextBox.getText().toLowerCase()

        let isMatching = false
        let slotMatches = this.slotMatches.get(slot.getIndex())
        if (slotMatches && Date.now() - slotMatches.timestamp < 500) {
            if (!slotMatches.isMatching) {
                Renderer.translate(0, 0, 100)
                Renderer.drawRect(Renderer.color(0, 0, 0, 200), slot.getDisplayX(), slot.getDisplayY(), 8 * Renderer.screen.getScale(), 8 * Renderer.screen.getScale())
            }
            return
        }
        let item = slot.getItem()
        if (item) {
            isMatching = !searchText.split("&").map(a => {
                a = a.trim()
                let isMatching2 = false
                if (ChatLib.removeFormatting(item.getName()).toLowerCase().includes(a)) isMatching2 = true
                if (!isMatching2 && item.getLore().some(b => ChatLib.removeFormatting(b).toLowerCase().includes(a))) isMatching2 = true
                return isMatching2
            }).includes(false)
        }

        this.slotMatches.set(slot.getIndex(), { isMatching, timestamp: Date.now() })

        if (!isMatching) {
            Renderer.translate(0, 0, 100)
            Renderer.drawRect(Renderer.color(0, 0, 0, 200), slot.getDisplayX(), slot.getDisplayY(), 8 * Renderer.screen.getScale(), 8 * Renderer.screen.getScale())
        }
    }

    guiClicked(mouseX, mouseY, button, gui, event) {
        if (gui.class.toString() === "class net.minecraft.client.gui.inventory.GuiChest" && button === 0 && this.replaceSbMenuClicks.getValue()) {

            let hoveredSlot = gui.getSlotUnderMouse()
            if (!hoveredSlot) return

            let hoveredSlotId = hoveredSlot[f.slotNumber]

            // logger.logMessage(hoveredSlotId, 4)

            if (this.guiSlotClicked(ChatLib.removeFormatting(Player.getContainer().getName()), hoveredSlotId)) {
                cancel(event)
            }
        }
    }

    step() {
        if (this.museumGuiEnabled.getValue()) this.museumGui.tick.call(this.museumGui)
        if (this.dungeonReadyGuiEnabled.getValue()) this.dungeonReady.tick.call(this.dungeonReady)

        if (this.replaceSbMenuClicks.getValue()) {
            if (Player.getContainer() && Player.getContainer().getName() === "SkyBlock Menu") {
                if (this.lastWindowId === 0) {
                    this.lastWindowId = Player.getContainer().getWindowId()
                    return;
                }
                if (Player.getContainer().getWindowId() !== this.lastWindowId) {
                    this.lastWindowId = Player.getContainer().getWindowId()
                    this.shouldHold += 10
                    if (Date.now() - this.clickSlotTime > 1000) {
                        this.clickSlot = -1
                    }
                    if (this.clickSlot && this.clickSlot != -1) {
                        Player.getContainer().click(this.clickSlot, false, "MIDDLE")
                        this.clickSlot = -1
                    }
                } else {
                    this.shouldHold--
                }
            } else {
                this.lastWindowId = 0
            }
        }
    }

    guiSlotClicked(inventoryName, slotId) {
        if (inventoryName.endsWith(" Sack")) return false
        switch (inventoryName) {
            case "SkyBlock Menu":
                switch (slotId) {
                    case 30:
                        ChatLib.command("pets")
                        break
                    case 25:
                        ChatLib.command("storage")
                        break
                    default:
                        if (this.shouldHold > 0 && this.reliableSbMenuClicks.getValue()) {
                            this.clickSlot = slotId
                            this.clickSlotTime = Date.now()
                        } else {
                            Player.getContainer().click(slotId, false, "MIDDLE")
                        }
                        break;
                }
                return true
                break
            default:
                if (this.middleClickGuis.includes(inventoryName)) {
                    Player.getContainer().click(slotId, false, "MIDDLE")
                    return true
                }
                for (let thing of this.middleClickStartsWith) {
                    if (inventoryName.startsWith(thing)) {
                        Player.getContainer().click(slotId, false, "MIDDLE")
                        return true
                    }
                }
                for (let thing of this.middleClickEndsWith) {
                    if (inventoryName.endsWith(thing)) {
                        Player.getContainer().click(slotId, false, "MIDDLE")
                        return true
                    }
                }
                return false
                break
        }
    }

    initVariables() {
        this.replaceSbMenuClicks = undefined
        this.lastWindowId = undefined
        this.shouldHold = undefined
        this.clickSlot = undefined
        this.clickSlotTime = undefined
        this.reliableSbMenuClicks = undefined
        this.middleClickGuis = undefined
        this.middleClickStartsWith = undefined
        this.middleClickEndsWith = undefined

        this.museumGui = undefined
    }

    onDisable() {
        this.initVariables()

        this.invSearchSoopyGui.delete()
    }
}

module.exports = {
    class: new BetterGuis()
}