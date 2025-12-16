const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kicks a member from the server.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to kick.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for kicking the menber.")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided.";
    const targetMember = await interaction.guild.members
      .fetch(target.id)
      .catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        content: "The specified user is not a member of this server.",
        ephemeral: true,
      });
    }

    if (!targetMember.kickable) {
      return interaction.reply({
        content: "I cannot kick this htey may have higher permissions that me",
        ephemeral: true,
      });
    }
    try {
      await targetMember.kick(reason);
      await interaction.reply({
        content: `Successfull kicked user ${target.tag}\nfrom the server\nReason: ${reason}`,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "An error occoured while try to kick the user",
        ephemeral: true,
      });
    }
  },
};
