import PostalMime, { Address, Email } from 'postal-mime';
import { Embed, Webhook } from '@vermaysha/discord-webhook';
import Env = Cloudflare.Env;

export default {
  async email(message, env, ctx) {
    const mail = await PostalMime.parse(message.raw);
    await Promise.allSettled([
      sendWebhook(mail, env),
      forwardMessage(message, env)
    ]);
  }
} satisfies ExportedHandler<Env>;

async function sendWebhook(mail: Email, env: Env) {
  // @ts-ignore
  const maybeASpam = !env.KNOWN_EMAILS.includes(message.to);

  const webhook = new Webhook(env.DISCORD_WEBHOOK);

  const subject = mail.subject !== undefined ? mail.subject : '(No subject)';
  const embed = new Embed()
    .setTitle('New email received!')
    .setFooter({
      text: "Kotatsu-RTM/kotatsu-tech-email",
    })
    .setTimestamp()
    .addField({
      name: "From",
      value: generateDisplayName(mail),
      inline: false,
    })
    .addField({
      name: "Subject",
      value: subject,
      inline: false,
    });

  if (maybeASpam) {
    embed
      .setDescription('⚠️ __**May contain spam contents!**__')
      .setColor('#f8b500');
  }

  await webhook
    .addEmbed(embed)
    .send()
    .catch((err) => console.error(err.message));
}

function generateDisplayName(mail: Email): string {
  function formatAddress(address: Address): string {
    if (address.name.length > 0) {
      return `${address!!.name} \<${address.address!!}\>`;
    } else {
      return address.address!!;
    }
  }

  if (mail.from.group !== undefined) {
    const groupName = mail.from.name.length > 0 ? mail.from.name : '==No Group Name Provided==';
    return `${groupName} (Sender: ${formatAddress(mail.sender!!)})`;
  } else {
    return formatAddress(mail.from);
  }
}

async function forwardMessage(message: ForwardableEmailMessage, env: Env) {
  await Promise.allSettled(
    env
      .EMAILS_FORWARD_TO
      .map(async (address) => {
        await message
          .forward(address)
          .catch((reason) => console.error(reason.message));
      })
  );
}
