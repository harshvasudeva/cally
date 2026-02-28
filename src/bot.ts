import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } from "discord.js";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import { format, addMinutes, parseISO } from "date-fns";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Load environment variables from both .env and .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

let lastCheck = new Date();

const commands = [
    new SlashCommandBuilder()
        .setName("book")
        .setDescription("Start a new booking")
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN!);

async function registerCommands() {
    try {
        if (!process.env.DISCORD_APPLICATION_ID) {
            console.error("❌ Error: DISCORD_APPLICATION_ID is missing in .env.local");
            return;
        }

        console.log(`🔄 Refreshing commands for App ID: ${process.env.DISCORD_APPLICATION_ID}...`);
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
            { body: commands }
        );
        console.log("✅ Successfully registered application (/) commands.");
    } catch (error) {
        console.error("❌ Error refreshing commands:", error);
    }
}

async function checkNotifications() {
    try {
        const now = new Date();
        const appointments = await prisma.appointment.findMany({
            where: {
                status: "CONFIRMED",
                updatedAt: { gt: lastCheck },
                guestUserId: { not: null }
            },
            include: { user: true, guestUser: true, appointmentType: true }
        });

        for (const appt of appointments) {
            if (appt.guestUser?.discordId) {
                try {
                    const discordUser = await client.users.fetch(appt.guestUser.discordId);
                    await discordUser.send(`🎉 **Booking Approved!**\n\nYour appointment **${appt.title}** has been confirmed.\n📅 ${format(appt.start, "PPP p")}`);
                    console.log(`✅ Sent notification to ${discordUser.username}`);
                } catch (err) {
                    console.warn(`Failed to DM user ${appt.guestUser.discordId}`, err);
                }
            }
        }
        lastCheck = now;
    } catch (error) {
        console.error("Notification check error:", error);
    }
}

client.on("ready", () => {
    console.log(`✅ Logged in as ${client.user?.tag}!`);
    registerCommands();
    setInterval(checkNotifications, 10000); // Check every 10s
});

// Debug: basic message handler to check if bot can read messages
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.content === "!ping") {
        try {
            await message.reply("Pong! 🏓 I am online.");
        } catch (error) {
            console.error("❌ Failed to reply to !ping:", error);
        }
    }
});

client.on("interactionCreate", async (interaction) => {
    console.log(`📨 Received interaction: ${interaction.type.toString()}`);
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === "book") {
                // Fetch Hosts
                const users = await prisma.user.findMany({
                    where: { appointmentTypes: { some: { isActive: true } } },
                    take: 25
                });

                if (users.length === 0) {
                    await interaction.reply({ content: "No users found accepting bookings.", ephemeral: true });
                    return;
                }

                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("select_host")
                            .setPlaceholder("Select a person to meet")
                            .addOptions(
                                users.map(u => ({
                                    label: u.name || "Unknown",
                                    description: u.email || undefined,
                                    value: u.id
                                }))
                            )
                    );

                await interaction.reply({ content: "👋 **Welcome!** Who would you like to meet with?", components: [row], ephemeral: true });
            }
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === "select_host") {
                const userId = interaction.values[0];
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    include: { appointmentTypes: true }
                });

                if (!user) {
                    await interaction.update({ content: "User not found.", components: [] });
                    return;
                }

                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`t_${user.id}`) // t_USERID -> Select Type
                            .setPlaceholder("Select an appointment type")
                            .addOptions(
                                user.appointmentTypes
                                    .filter(t => t.isActive)
                                    .map(t => ({
                                        label: t.name,
                                        description: `${t.duration} mins`,
                                        value: t.id
                                    }))
                            )
                    );

                await interaction.update({
                    content: `Booking with **${user.name}**. Select an appointment type:`,
                    components: [row]
                });

            } else if (interaction.customId.startsWith("t_")) {
                const userId = interaction.customId.split("_")[1];
                const typeId = interaction.values[0];

                const today = new Date();
                const dates = Array.from({ length: 5 }, (_, i) => {
                    const d = new Date();
                    d.setDate(today.getDate() + i + 1);
                    return d;
                });

                // ID: d_TYPEID_DATE
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        dates.map(date =>
                            new ButtonBuilder()
                                .setCustomId(`d_${typeId}_${format(date, "yyyy-MM-dd")}`)
                                .setLabel(format(date, "EEE, MMM d"))
                                .setStyle(ButtonStyle.Secondary)
                        )
                    );

                await interaction.update({
                    content: `Select a date:`,
                    components: [row]
                });
            } else if (interaction.customId.startsWith("s_")) {
                // s_TYPEID_DATE -> Value = TIME
                const [_, typeId, dateStr] = interaction.customId.split("_");
                const timeStr = interaction.values[0];

                // ID: c_TYPEID_DATE_TIME
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`c_${typeId}_${dateStr}_${timeStr}`)
                            .setLabel(`Request ${timeStr}`)
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.update({
                    content: `Selected ${timeStr} on ${dateStr}. Click to send request.`,
                    components: [row]
                });
            }
        } else if (interaction.isButton()) {
            if (interaction.customId.startsWith("d_")) {
                const [_, typeId, dateStr] = interaction.customId.split("_");

                // MOCK SLOTS (For now)
                const slots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"];

                // ID: s_TYPEID_DATE
                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`s_${typeId}_${dateStr}`)
                            .setPlaceholder("Select a time")
                            .addOptions(
                                slots.map(time => ({
                                    label: time,
                                    value: time
                                }))
                            )
                    );

                await interaction.update({
                    content: `Date: ${dateStr}. Select a time:`,
                    components: [row]
                });
            } else if (interaction.customId.startsWith("c_")) {
                const [_, typeId, dateStr, timeStr] = interaction.customId.split("_");
                const guestDiscordId = interaction.user.id;
                const guestUsername = interaction.user.username;

                // CHECK IF GUEST ALREADY EXISTS
                const guestUser = await prisma.user.findUnique({
                    where: { discordId: guestDiscordId }
                });

                if (guestUser) {
                    // FAST TRACK - Show Confirmation Button
                    // ID: f_TYPEID_DATE_TIME_GUESTID
                    const row = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`f_${typeId}_${dateStr}_${timeStr}_${guestUser.id}`)
                                .setLabel(`✅ Send Request as ${guestUser.name}`)
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`cancel`)
                                .setLabel("Cancel")
                                .setStyle(ButtonStyle.Secondary)
                        );

                    await interaction.update({
                        content: `**Found your account!**\n\nName: ${guestUser.name}\nEmail: ${guestUser.email || "Not set"}\n\nSubmit request for **${dateStr} at ${timeStr}**?`,
                        components: [row]
                    });
                } else {
                    // NEW GUEST - Show Registration Modal
                    // ID: m_TYPEID_DATE_TIME
                    const modal = new ModalBuilder()
                        .setCustomId(`m_${typeId}_${dateStr}_${timeStr}`)
                        .setTitle("New Account & Booking");

                    const nameInput = new TextInputBuilder()
                        .setCustomId("nameInput")
                        .setLabel("Your Name")
                        .setValue(guestUsername) // Pre-fill with Discord username
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    const emailInput = new TextInputBuilder()
                        .setCustomId("emailInput")
                        .setLabel("Your Email (Optional)")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    const notesInput = new TextInputBuilder()
                        .setCustomId("notesInput")
                        .setLabel("Notes")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false);

                    modal.addComponents(
                        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
                        new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput),
                        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
                    );

                    await interaction.showModal(modal);
                }
            } else if (interaction.customId.startsWith("f_")) {
                const [_, typeId, dateStr, timeStr, guestUserId] = interaction.customId.split("_");

                await interaction.deferReply({ ephemeral: true }); // Prevent timeout

                const start = parseISO(`${dateStr}T${timeStr}:00`);
                const type = await prisma.appointmentType.findUnique({ where: { id: typeId } });
                const guestUser = await prisma.user.findUnique({ where: { id: guestUserId } });

                if (!type || !guestUser) {
                    await interaction.editReply("Error: Reference data not found.");
                    return;
                }

                const end = addMinutes(start, type.duration || 30);

                try {
                    await prisma.appointment.create({
                        data: {
                            title: `${type.name} with ${guestUser.name || "Guest"}`,
                            start,
                            end,
                            guestName: guestUser.name || "Guest",
                            guestEmail: guestUser.email || "No Email (Discord)",
                            guestUserId: guestUser.id,
                            userId: type.userId,
                            appointmentTypeId: typeId,
                            status: "PENDING"
                        }
                    });

                    await interaction.editReply({ content: `📨 **Booking Request Sent!**\n\n📅 ${dateStr} at ${timeStr}\n👤 ${guestUser.name}\n\nYour request has been submitted to the host for approval. You will receive a DM when confirmed.` });
                } catch (error) {
                    console.error(error);
                    await interaction.editReply({ content: "Failed to create appointment." });
                }
            } else if (interaction.customId === "cancel") {
                await interaction.update({ content: "❌ Cancelled.", components: [] });
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith("m_")) {
                const [_, typeId, dateStr, timeStr] = interaction.customId.split("_");
                const name = interaction.fields.getTextInputValue("nameInput");
                const email = interaction.fields.getTextInputValue("emailInput") || null; // Handle optional
                const notes = interaction.fields.getTextInputValue("notesInput");

                const start = parseISO(`${dateStr}T${timeStr}:00`);
                const type = await prisma.appointmentType.findUnique({ where: { id: typeId } });

                if (!type) { await interaction.reply({ content: "Error: Type not found.", ephemeral: true }); return; }

                const end = addMinutes(start, type.duration || 30);

                try {
                    // CREATE NEW USER LINKED TO DISCORD
                    const newGuest = await prisma.user.create({
                        data: {
                            name,
                            email: email || null, // Allow null if optional
                            discordId: interaction.user.id,
                            slug: uuidv4(),
                            password: uuidv4()
                        }
                    });

                    // CREATE APPOINTMENT
                    await prisma.appointment.create({
                        data: {
                            title: `${type.name} with ${name}`,
                            start,
                            end,
                            guestName: name,
                            guestEmail: email || "No Email (Discord)",
                            guestNotes: notes,
                            guestUserId: newGuest.id,
                            userId: type.userId,
                            appointmentTypeId: typeId,
                            status: "PENDING"
                        }
                    });

                    await interaction.reply({ content: `📨 **Booking Request Sent!**\n\n📅 ${dateStr} at ${timeStr}\n👤 ${name}\n\nWe created a Cally account for you. Your request is pending approval. You will receive a DM when confirmed.`, ephemeral: true });
                } catch (error: any) {
                    console.error("Error creating account/appointment:", error);
                    if (error.code === 'P2002') {
                        await interaction.reply({ content: "❌ **Error: Email Address Taken**\nThat email is already registered to another user.\nPlease try again with a different email, or just leave the Email field blank to proceed with your Discord ID only.", ephemeral: true });
                    } else {
                        await interaction.reply({ content: "❌ Failed to submit request. Please try again.", ephemeral: true });
                    }
                }
            }
        }
    } catch (e) {
        console.error("Interaction error:", e);
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
